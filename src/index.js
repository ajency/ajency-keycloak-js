(function(win){

    function Ajkeycloak(config){
        if (!(this instanceof Ajkeycloak)) {
            return new Ajkeycloak(config);
        }

        if(Ajkeycloak.instance)
            return Ajkeycloak.instance;
        
        Ajkeycloak.instance = this;


        this.initialise(config);
    } // end contructor

    Ajkeycloak.prototype = (function(){

        // declare private member variables
        function _success_action(result, deferred, callback){
            typeof callback === 'function' ? callback(result) : null;
            deferred.resolve(result);
        }
    
        function _failure_action(error, deferred, callback){
            typeof callback === 'function' ? callback(error) : null;
            deferred.reject(error);
        }

        function get_client_role(resource_access){

            if(Ajkeycloak.instance.CONFIG.resource){
                var clientroles = null;
                for(var index in resource_access){
                    if(index === Ajkeycloak.instance.CONFIG.resource){
                        clientroles = resource_access[index];
                    }
                }
                return clientroles ? clientroles.roles ? clientroles.roles: clientroles : null;
            }
            else{
                return resource_access;
            }
        }

        function membership_path_check(group_to_check, group_string){
            var group_match_string = null;
            var group_paths = group_string.split('/');
            if(group_paths.length){
                var lastindex = group_paths.length - 1
                group_match_string = group_paths[lastindex].indexOf(group_to_check) === 0 ? group_string: null;
            }
            return group_match_string;
        }

        return {
            constructor: Ajkeycloak,
            initialise: function(config){
                    if(config){
                        if(config["auth-server-url"])
                            config["url"] = config["auth-server-url"];
            
                        if(config["resource"])
                            config["clientId"] = config["resource"];
            
                        Ajkeycloak.instance.CONFIG = config;
                        Ajkeycloak.instance.keycloak = Keycloak(config);
                    }
                },
            bootstrap: function(jsonpath,keycloakoptions,bootstrapAngularCB){
                try{
                    Ajkeycloak.instance.makeRequest(jsonpath)
                    .then( function(keycloakjson) {
                        //do stuff with your data here
                        var redirecturl = window.location.pathname.length > 1 ? window.location.pathname : window.location.hash;
                        var hashlocationstrategy = redirecturl.indexOf('#') === 0 ? true : false;
                        
                        if(hashlocationstrategy && redirecturl.length > 2 || !hashlocationstrategy && redirecturl.length > 1){

                            if(hashlocationstrategy){
                                Ajkeycloak.instance.redirectUrl = redirecturl.indexOf("/") === 1 ? redirecturl : '';
                            }
                            else{
                                Ajkeycloak.instance.redirectUrl = redirecturl;
                            }
    
                            if(Ajkeycloak.instance.redirectUrl){
                                if (window.localStorage) {
                                    localStorage.setItem('ajredirecturl',Ajkeycloak.instance.redirectUrl);
                                }
                            }
    
                        }


                        Ajkeycloak.instance.initialise(JSON.parse(keycloakjson));

                        var ajkeycloak = Ajkeycloak.instance;
                  
                        ajkeycloak.keycloak.init(keycloakoptions)
                                        .success(function () {
                                        ajkeycloak.keycloak.loadUserInfo().success(function (userInfo) {
                                            // console.log("userinfo", userInfo);
                                                ajkeycloak.userInfo = userInfo;
                                                if(typeof bootstrapAngularCB === 'function'){
                                                    if(window.localStorage){
                                                        ajkeycloak.redirectUrl = localStorage.getItem('ajredirecturl');
                                                    }
                                                    else{
                                                        console.warn("browser doesnt support local storage! redirects wont work");
                                                    }
                                                    console.log("saved redirecturl", ajkeycloak.redirectUrl);
                    

                                                    bootstrapAngularCB(ajkeycloak,userInfo);
                                                }
                                                else{
                                                    console.warn("invalid bootstrap callback");
                                                }
                                   
                                            })
                                            .error(function(error){
                                            console.warn("user info error: ", error);
                                            });
                                        })
                                        .error(function(err){
                                            console.warn("init error:", err);
                                        });
                    }).catch(function(err){
                        console.warn("keycloak json error: ", err);
                    });
              

                }
                catch(e){
                    console.warn("bootstrap error: ", e);
                }
              },
            bootstrapAngular: function(angularoptions , bootstrapAngularCB){

                    if(!angular){
                        console.warn("angular is not defined");
                        return
                    }

                    if(!angularoptions.keycloakjson){
                        console.warn("missing keycloak json path");
                        return;
                    }

                    // perform validations on passed in options dictionary
                    var angularmoduleinstance, angularmodulename;
                    if(angularoptions.angularmodule){
                        if(angularoptions.angularmodule.name && typeof angularoptions.angularmodule.name === 'string' && angularoptions.angularmodule.instance){
                            angularmoduleinstance = angularoptions.angularmodule.instance;
                            angularmodulename = angularoptions.angularmodule.name;
                        }
                        else{
                            console.warn("angularmodule property has incorrect format");
                            return;
                        }
                    }
                    else{
                        console.warn("options is missing angular module property");
                        return;
                    }

                    if(!angularoptions.bootstrapnode){
                        console.warn("options is missing bootstrapnode property");
                        return;
                    }

                    if( !( angularoptions.runblock && (typeof angularoptions.runblock === 'function' ||  typeof angularoptions.runblock === 'object') ) ){
                        console.warn("options is missing runblock callback or has incorrect format");
                        return;
                    }

                    if(!angularoptions.keycloakoptions){
                        console.warn("options is missing keycloakoptions");
                        return;
                    }



                    Ajkeycloak.instance.bootstrap(angularoptions.keycloakjson, angularoptions.keycloakoptions, function(keycloakinstance,keycloakuserInfo){

                        angularmoduleinstance.constant("$ajkeycloak",keycloakinstance); // add keycloak instance as constant
                        
                        angularmoduleinstance.factory('$ajkeycloakservice',["$rootScope","KCuiPermissions",function($rootScope, KCuiPermissions){
                            $rootScope.ajkeycloak = keycloakinstance;
                            $rootScope.KCuiPermissions = KCuiPermissions;

                            keycloakinstance.inValidApiAccess = false;
                            return keycloakinstance;
           
                        }]);
 

                        typeof bootstrapAngularCB === 'function' ? bootstrapAngularCB(keycloakinstance,keycloakuserInfo) : null;

                        // add any additional helper services here
                        if(angularoptions.helperservices){
                            for(var servicename in angularoptions.helperservices){
                                var servicecontainer = angularoptions.helperservices[servicename];
                
                                if(servicecontainer.service && (typeof servicecontainer.service === 'function' || typeof servicecontainer.service === 'object') ){
                                    var servicetype = servicecontainer.type;
                                    if( servicetype === 'factory' ){
                                        angularmoduleinstance.factory(servicename, servicecontainer.service);
                                        console.log("factory", servicename , "added");
                                    }
                                    else if( servicetype === 'service' ){
                                        angularmoduleinstance.service(servicename, servicecontainer.service);
                                        console.log("service", servicename , "added");
                                    }
  
                                }
                            }
                        }

                        // add the http interceptor here
                        if(angularoptions.interceptor && ( typeof angularoptions.interceptor === 'function' || typeof angularoptions.interceptor === 'object' )){
                            angularmoduleinstance.factory('setKeycloakHeaders', angularoptions.interceptor);

                            angularmoduleinstance.config(function($httpProvider){
                                $httpProvider.interceptors.push('setKeycloakHeaders');
                                console.log("keycloak interceptor injected");
                              });
                        }

                        angular.bootstrap(angularoptions.bootstrapnode, [angularmodulename]);

                        angularmoduleinstance.run(angularoptions.runblock);

                        // angularmoduleinstance.constant(localStorage.getItem('ajredirecturl'));
                    
                    });
                },
            protect: function(permissions, successcb, errorcb){
                var deferred = Q.defer();
                Ajkeycloak.instance.decoded_rpt = null;
                if(permissions && permissions.length){  // code for entitlements check
                    var entitlements = { 
                        "permissions" : permissions
                    }
        
                    try{
                        Ajkeycloak.instance.keycloak.updateToken(5).success(function(refreshed){
                            var url = Ajkeycloak.instance.CONFIG['url'] + '/realms/' + Ajkeycloak.instance.CONFIG['realm'] + '/authz/entitlement/' + Ajkeycloak.instance.CONFIG['clientId'];
                            Ajkeycloak.instance.makeRequest(
                                    url, 
                                    permissions[0] === 'all' ? 'GET' : 'POST',
                                    entitlements,
                                    {
                                        'Content-Type': 'application/json',
                                        'Authorization': 'Bearer ' + Ajkeycloak.instance.keycloak.token
                                    }
                                )
                                .then(function(res){
                                    var json = JSON.parse(res);
                                    if(json.rpt){
                                        Ajkeycloak.instance.decoded_rpt = Ajkeycloak.instance.jwtDecode(json.rpt);
                                        _success_action( Ajkeycloak.instance.decoded_rpt, deferred, successcb );
                                    }
                                    else{
                                        _success_action(json, deferred, successcb);
                                    }
                                })
                                .catch(function(err){
                                    _failure_action(err, deferred, errorcb);
                                });    
                          })
                          .error(function(err){
                            _failure_action(err, deferred, errorcb);
                          });
                    }
                    catch(e){
                        _failure_action(e, deferred, errorcb);
                    }
        
                    }
                    else{  // default authorization
                        if(Ajkeycloak.instance.keycloak.authenticated){
                            _success_action({}, deferred, successcb);
                        }
                        else{
                            _failure_action({}, deferred, errorcb);
                        }
                    }
        
                    return deferred.promise;
        
                }, // end protect
            makeRequest: function(url,method,body,headers){
                    var deferred = Q.defer();
                    var request = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        
                    request.open(method || 'GET', url, true);
        
                    for(header in headers){
                        request.setRequestHeader(header, headers[header]);
                    }
        
                    var querystring = typeof body === 'object' ? JSON.stringify(body) : body;
        
                    request.onreadystatechange = function() {
                        if (request.readyState == 4) {
                            if(request.status == 200){
                                _success_action(request.response, deferred, null);
                            }
                            else{
                                _failure_action(request.response, deferred, null);
                            }
                        }
                    };
        
        
                    request.send(method === 'POST' ? querystring : '');
                    
                    return deferred.promise;
                },
            jwtDecode: function(jwt){
                    if(window && window.atob){
                        var base64Url = jwt.split('.')[1];
                        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        return JSON.parse(atob(base64));
                    }
                    else{
                        console.warn("no base64 decode support");
                        return false;
                    }
                },
            hasAccess: function(permissions){ //synchronous no promise required
                var decoded_rpt = Ajkeycloak.instance.decoded_rpt;
                if(permissions && permissions.length){
                    if(decoded_rpt && decoded_rpt.authorization && decoded_rpt.authorization.permissions && decoded_rpt.authorization.permissions.length){
                        // check for permissions here
                        var rpt_permissions = decoded_rpt.authorization.permissions;
    
                        var permission_status = true;
                        rpt_permissions.some(function(rpt_perm){
                            var req_perm = permissions.find(function(perm){
                                return perm.resource_set_name === rpt_perm.resource_set_name;
                            });
    
                            if(req_perm){
    
                                if(req_perm.scopes && rpt_perm.scopes){
                                    var scopematch = true;
                                    req_perm.scopes.map(function(reqscope){
                                        var found = rpt_perm.scopes.some(function(resscope){
                                            return reqscope === resscope;
                                        });
    
                                        if(!found)
                                            scopematch = false;
    
                                    });
            
                                    permission_status = scopematch;
                                    return permission_status;
    
                                }
                                else if(!req_perm.scopes && !rpt_perm.scopes){
                                    permission_status = true;
                                    return permission_status;
                                }
                                else if(!req_perm.scopes && rpt_perm.scopes){
                                    permission_status = true;
                                    return permission_status;
                                }
                                else if(req_perm.scopes && !rpt_perm.scopes){
                                    permission_status = false;
                                    return permission_status;
                                }
            
                            }
                            else{
                                // console.warn(rpt_perm.resource_set_name + " not present");
                                permission_status = false;
                                return permission_status;
                            }
                        }); // end rpt_permissions map 
    
                        // console.log("permissions status: ", permission_status);
                        return permission_status;
                    }
                    else{
                        // console.warn("no permissions in rpt");
                        return false;
                    }
                }
                else{
                    return Ajkeycloak.instance.keycloak.authenticated;
                }
            },
            clearRedirectUrl: function(){
                Ajkeycloak.instance.redirectUrl = null;
                localStorage.removeItem('ajredirecturl');
            },
            getUserRoles: function(){
                try{
                    if(Ajkeycloak.instance.keycloak.token){
                        var userinfo = Ajkeycloak.instance.jwtDecode(Ajkeycloak.instance.keycloak.token);
                        if(userinfo.resource_access){
                            return get_client_role(JSON.parse(JSON.stringify(userinfo.resource_access)));
                        }
                        else{
                            return null;
                        }
    
                    }
                    else{
                        return null;
                    }
                }
                catch(e){
                    return null;
                }
            },
            userBelongsToRoles: function(req_roles){
                try{
                    if(req_roles){
                        var roles = Ajkeycloak.instance.getUserRoles();
            
                        if(roles){
                            if(typeof req_roles === 'string'){
                                var present = roles.some(function(role){
                                    return role === req_roles;
                                });
            
                                return present;
                            }
                            else if(typeof req_roles === 'object' && req_roles.length){
                                var roleresponse = {};
            
                                req_roles.map(function(req_role){
                                    var rolefound = roles.find(function(role){
                                        return role === req_role;
                                    });
            
                                    if(rolefound){
                                        roleresponse[req_role] = true;
                                    }
                                    else{
                                        roleresponse[req_role] = false;
                                    }
                                });
            
                                return roleresponse;
                            }
                            else{
                                return null;
                            }
                        }
                        else{
                            return null;
                        }
            
                    }
                    else{
                        return null;
                    }
                }
                catch(e){
                    return null;
                }
        
            },
            getUserGroupMembership: function(){
                try{
                    if(Ajkeycloak.instance.keycloak.token){
                        var userinfo = Ajkeycloak.instance.jwtDecode(Ajkeycloak.instance.keycloak.token);
                        if(userinfo["group-membership"]){
                            return JSON.parse(JSON.stringify(userinfo["group-membership"]));
                        }
                        else{
                            return null;
                        }
                    }
                    else{
                        return null;
                    }
                }
                catch(e){
                    return null;
                }
            },
            userBelongsToGroups: function(req_groups){
                try{
                    if(req_groups){
                        var groups =  Ajkeycloak.instance.getUserGroupMembership();
            
                        if(groups){
                            if(typeof req_groups === 'string'){
                                var matches = [];
                                var present = groups.map(function(group){
                                    var match_string = membership_path_check(req_groups, group);
                                    if(match_string){
                                        matches.push(match_string);
                                    }
                                    return match_string ? true : false;
                                });
            
                                return matches;
                            }
                            else if(typeof req_groups === 'object' && req_groups.length){
                                var group_present = {};
            
                                req_groups.map(function(req_group){
                                    var groupsfound = groups.filter(function(group){
                                        var match_string = membership_path_check(req_group, group);
                                        return match_string ? true : false;
                                    });
            
                                    if(groupsfound){
                                        group_present[req_group] = groupsfound;
                                    }
                                    else{
                                        group_present[req_group] = [];
                                    }
                                });
            
                                return group_present;
                            }
                            else{
                                return null;
                            }
                        }
                        else{
                            return null;
                        }
                    }
                    else{
                        return null;
                    }
                }
                catch(e){
                    return null;
                }
        
            }
        }
    })()

    if ( typeof module === "object" && module && typeof module.exports === "object" ) {
        module.exports = Ajkeycloak;
    } else {
        window.Ajkeycloak = Ajkeycloak;

        if ( typeof define === "function" && define.amd ) {
            define( "Ajkeycloak", [], function () { return Ajkeycloak; } );
        }
    }

})(window);