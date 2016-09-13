'use strict';

import sqldb from '../../sqldb';
import _ from 'lodash';
var Promise = require("bluebird");

export default function (sequelize, DataTypes) {
	return sequelize.define('Space', {
		_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true
		},
		name: {
			type: DataTypes.STRING,
			unique: {
				msg: 'The specified space name is already in use.'
			}
		},
		alias: DataTypes.STRING,
		description: DataTypes.STRING,
		typeId: DataTypes.INTEGER,
		active: DataTypes.BOOLEAN
	}, {
			getterMethods: {
				profile: function () {
					return {
						alias: this.alias,
						description: this.description
					}
				}
				/*
				type: function(){
					return Category.findById(typeId);
				}
				*/
			},
			classMethods: {
				getUserSpaces: function (userId) {
					UserRole.belongsTo(User);
					UserRole.blongsTo(this);
					return UserRole.findAll({
						attributes: ['spaceId', 'userId'],
						where: { userId: userId },
						include: [User, this],
						group: ['spaceId']
					});
				},
				addType: function (typeData) {
					return this.getType(typeData, true);
				},
				getType: function (typeData, autoCreated) {
					//console.log('in space Category:', typeData);
					//console.log('in space User:', User);
					//console.log('in space sqldb:', sqldb);
					var Category = sqldb.Category;
					//var Category = sqldb.Category;
					//console.log('in space Category:', Category);
					if (typeof typeData === 'string' && isNaN(typeData)) {
						var typeName = typeData;

						typeData = {};

						typeData.name = typeName;

						//console.log('in space getType');
						//console.log('in space Category:', Category);
						//console.log('space getType typeData:', JSON.stringfy(typeData));
					}

					if (!isNaN(typeData) && typeData > 0) {
						return Category.findById(typeData);
					}

					if (typeof typeData === 'object' && !_.isEmpty(typeData)) {
						typeData.owner = 'space';
						var tyName = typeData.name;
						if (tyName.substr(0, 5).toLowerCase() !== 'space') {
							tyName = 'space.' + tyName;
						}
						typeData.name = tyName;
						//console.log('space model typeData:', JSON.stringify(typeData));
						return Category.getType(typeData, true);
					}

					//otherwise return promise reject
					sequelize.Promise.reject(new Error('fail to add type!'));
				},
				//this function can use to create
				//params: {name:xxx, alias:xxx, type:xxx, roles: [...]}
				//return space with type and roles
				add: function (spaceData) {
					var that = this;
					var typeId, spaceId;
					var Category = sqldb.Category;
					var Role = sqldb.Role;

					this.hasMany(Role, { as: 'roles' });
					this.belongsTo(Category, { as: 'type' });

					return new Promise(function (resolve, reject) {
						if (spaceData.typeId) {
							typeId = spaceData.typeId;
							return resolve(spaceData.typeId);
						} else if (spaceData.type) {
							if (spaceData.type.roles) {
								spaceData.roles = spaceData.type.roles;
								delete spaceData.type.roles;
							}
							if (spaceData.type.apps) {
								spaceData.apps = spaceData.type.apps;
								delete spaceData.type.roles;
							}
							return that.addType(spaceData.type).then(function (type) {
								typeId = type._id;
								return resolve(type._id);
							})
						}
						return resolve(null);
					}).then(function (typeId) {
						//console.log('typeId:', typeId);
						spaceData.typeId = typeId;
						return that.findOrCreate({
							where: {
								name: spaceData.name //spaceName must be unique name
							},
							defaults: spaceData
						})
					}).spread(function (space, created) {
						spaceId = space._id;
						//console.log('space', JSON.stringify(space));
						if (spaceData.roles) {
							var hasAdmin = false;
							var hasMember = false;
							//var hasCustomer = false;
							var hasPublic = false;
							spaceData.roles.forEach(function (role) {
								if (role.name === 'admin') {
									role.allowDelete = false;
									hasAdmin = true;
								}
								if (role.name === 'member') {
									role.allowDelete = false;
									hasMember = true;
								}
								/*
								if(role.name === 'customer'){
									role.allowDelete = false;
									hasCustomer = true;
								}*/
								if (role.name === 'public') {
									role.allowDelete = false;
									hasPublic = true;
								}
							})

							if (!hasAdmin) {
								spaceData.roles.push(
									{
										name: "admin",
										allowDelete: false
									}
								)
							}

							if (!hasMember) {
								spaceData.roles.push(
									{
										name: "member",
										allowDelete: false
									}
								)
							}
							/*
							if(!hasCustomer){
								spaceData.roles.push(
									{
										name: "customer",
										allowDelete: false
									}
								)
							}*/
							if (!hasPublic) {
								spaceData.roles.push(
									{
										name: "public",
										allowDelete: false
									}
								)
							}
							return that.addRoles(spaceData.roles, space._id);
						}
						return Promise.resolve(null);
					}).then(function () {
						//console.log('spaceId:', spaceId);
						return that.find({
							where: {
								_id: spaceId
							},
							include: [
								{
									model: Category, as: 'type'
								},
								{
									model: Role, as: 'roles'
								}
							]
						}).then(function (space) {
							//console.log('space:',JSON.stringify(space));
							return Promise.resolve(space);
						})
					})
				},

				addRoles: function (listRoleData, spaceId) {

					var that = this;
					var roles = [];

					return Promise.each(listRoleData, function (roleData) {

						return that.addRole(roleData, spaceId).then(function (role) {
							roles.push(role);
						})
					})
				},

				addRole: function (roleData, spaceId) {

					var Role = sqldb.Role;

					if (typeof roleData === 'string') {
						roleData = {
							name: roleData
						}
					}

					if (typeof roleData === 'object') {
						if (!isNaN(spaceId) && spaceId > 0) {
							roleData.spaceId = spaceId;
						}
						//console.log('roleData:',JSON.stringify(roleData));
						if (!roleData.spaceId || !roleData.name || roleData.name === "") {
							return Promise.reject('please provide spaceId and role name!');
						}
						return Role.addRole(roleData);
					} else {
						return Promise.reject('fail to add role!');
					}

				},

				addUserSpace: function (user) {
					var spaceData = {};
					var newSpace;
					var UserRole = sqldb.UserRole;
					var App = sqldb.App;
					if (typeof user === 'object') {
						var alias = user.alias || user.name || user.loginId;
						spaceData.name = 'mySpace_of_' + user.loginId;
						spaceData.alias = 'mySpace(' + alias +')';
						spaceData.type = 'personal';
						return this.add(spaceData).then(function (space) {
							//add user into admin of space
							newSpace = space;
							return UserRole.add({
								userId: user._id,
								role: 'admin',
								spaceId: space._id
							});
						})
							.then(function () {
								//add appEngine for user space
								return App.add(
									{
										"name":"appEngine",
										"alias": "appEngine",
										"type": "app.core",
										"cores": {
											"role": {
												"grants": {
													"admin": "adminSpaceRole|管理机构角色,adminUserRole|管理用户角色",
													"everyone": "myRole|我的角色"
												}
											},
											"space": {
												"grants": {
													"admin": [
														{
															"name": "adminSpace",
															"alias": "机构设置"
														},
														{
															"name": "appStore",
															"alias": "应用商店"
														}
													]
												}
											},
											"collab": {
												"grants": {
													"admin": ["adminCollab|设置协作"],
													"manager": ["manageCollab|管理协作"],
													"everyone": "collabNuts|协作功能"
												}
											},
											"circle": {
												"grants": {
													"admin": ["adminCircle|设置机构圈"],
													"manager": ["manageCircle|管理机构圈"],
													"everyone": ["circleMember|机构圈主页"]
												}
											}
										}
									},newSpace._id
								);
							})
							.then(function () {
								//add personApp for user space
								return App.add(
									{
										"name":"personApp",
										"alias": "Person App",
										"type": "app.core",
										"cores": {
											"user": {
												"grants": {
													"admin": "adminUser, myProfile"
												}
											}
										}
									},newSpace._id
								);
							})
							.then(function () {
								return newSpace;
							})
					}
				}
			},
			instanceMethods: {

				addRole: function (roleData) {

					var Role = sqldb.Role;

					if (typeof roleData === 'string') {
						roleData = {
							name: roleData
						}
					}

					roleData.spaceId = this._id;

					return Role.addRole(roleData);
				}

			},
			hooks: {

			}
		});
}
