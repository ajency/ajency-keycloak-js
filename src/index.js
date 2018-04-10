(function(win){

    function Ajkeycloak(config){
        if (!(this instanceof Ajkeycloak)) {
            return new Ajkeycloak(config);
        }

        if(Ajkeycloak.instance)
            return this;
        
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
                        Ajkeycloak.instance.initialise(JSON.parse(keycloakjson));

                        var ajkeycloak = Ajkeycloak.instance;
                  
                        ajkeycloak.keycloak.init(keycloakoptions)
                                        .success(function () {
                                        ajkeycloak.keycloak.loadUserInfo().success(function (userInfo) {
                                            // console.log("userinfo", userInfo);
                
                                                if(typeof bootstrapAngularCB === 'function'){
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
                                    'POST',
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
                        rpt_permissions.map(function(rpt_perm){
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
            
                                    if(!scopematch){
                                        // console.warn("missing scope match for ", rpt_perm.resource_set_name);
                                        permission_status = scopematch;
                                        return permission_status;
                                    }
    
                                }
                                else{
                                    if(!req_perm.scopes && !rpt_perm.scopes){
                                        // console.warn("no scopes present");
                                        return true;
                                    }
                                    else{
                                        // console.warn("scopes mismatch");
                                        permission_status = false;
                                        return permission_status;
                                    }
    
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