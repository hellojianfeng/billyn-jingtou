var appServices = angular.module('starter.services', []);// Use for all service of application.

appServices.factory('blnApi',api);

/** @ngInject */
function api($resource) {
    
    var api = {};

    // Base Url
    api.baseUrl = '';

    api.auth = $resource(api.baseUrl + '/api/auth/:id/:controller', {
        id: '@_id'
    }, {
            local: {
                method: 'POST',
                params: {
                    id: 'local'
                }
            }
        });

    api.user = $resource(api.baseUrl + '/api/users/:id/:controller', {
        id: '@_id'
    }, {
            changePassword: {
                method: 'PUT',
                params: {
                    controller: 'password'
                }
            },
            me: {
                method: 'GET',
                params: {
                    controller: 'me'
                }
            }
        });
}