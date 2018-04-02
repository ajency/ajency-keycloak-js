(function(win){

    function Ajkeycloak(config){
        if (!(this instanceof Ajkeycloak)) {
            return new Ajkeycloak(config);
        }

        if(Ajkeycloak.instance)
            return this;
        
        Ajkeycloak.instance = this;

        if(config["auth-server-url"])
            config["url"] = config["auth-server-url"];

        if(config["resource"])
            config["clientId"] = config["resource"];

        var keycloak = Keycloak(config);
        this.CONFIG = config;
        this.keycloak = keycloak;
    }

    Ajkeycloak.prototype.protect = function(permissions){
        var deferred = Q.defer();
        Ajkeycloak.instance.decoded_rpt = null;
        if(permissions && typeof permissions === 'object' && permissions.length){  // code for entitlements check
            var entitlements = { 
                "permissions" : permissions
            }

            try{
                Ajkeycloak.instance.keycloak.updateToken(5).success(function(refreshed){
                    let url = Ajkeycloak.instance.CONFIG['url'] + '/realms/' + Ajkeycloak.instance.CONFIG['realm'] + '/authz/entitlement/' + Ajkeycloak.instance.CONFIG['clientId'];
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
                                deferred.resolve( Ajkeycloak.instance.decoded_rpt );
                            }
                            else{
                                deferred.resolve(json);
                            }
                        })
                        .catch(function(err){
                            deferred.reject(err);
                        });    
                  })
                  .error(function(err){
                    deferred.reject(err);
                  });
            }
            catch(e){
                deferred.reject(e);
            }

        }
        else{  // default authorization
            if(Ajkeycloak.instance.keycloak.authenticated){
                deferred.resolve();
            }
            else{
                deferred.reject();
            }
        }

        return deferred.promise;

    } // end protect

    Ajkeycloak.prototype.makeRequest = function(url,method,body,headers){
        var deferred = Q.defer();
        var request = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");

        request.open(method || 'GET', url, true);

        for(header in headers){
            request.setRequestHeader(header, headers[header]);
        }

        var querystring = typeof body === 'object' ? JSON.stringify(body) : body;

        request.onreadystatechange = function() {
            if (this.readyState == 4) {
                if(this.status == 200){
                    deferred.resolve(this.response);
                }
                else{
                    deferred.reject(this);
                }
            }
          };


        request.send(method === 'POST' ? querystring : '');
        
        return deferred.promise;
    }

    Ajkeycloak.prototype.jwtDecode = function(jwt){
        if(window && window.atob){
            var base64Url = jwt.split('.')[1];
            var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(base64));
        }
        else{
            console.warn("no base64 decode support");
            return false;
        }
    }

    Ajkeycloak.prototype.hasAccess = function(permissions){
        var decoded_rpt = Ajkeycloak.instance.decoded_rpt;
        if(permissions && permissions.length){
            if(decoded_rpt && decoded_rpt.authorization && decoded_rpt.authorization.permissions && decoded_rpt.authorization.permissions.length){
                // check for permissions here
                var rpt_permissions = decoded_rpt.authorization.permissions;

                var globalmatch = true;
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
                                console.warn("missing scope match for ", rpt_perm.resource_set_name);
                                globalmatch = scopematch;
                                return globalmatch;
                            }

                        }
                        else{
                            if(!req_perm.scopes && !rpt_perm.scopes){
                                console.warn("no scopes present");
                                return true;
                            }
                            else{
                                console.warn("scopes mismatch");
                                globalmatch = false;
                                return globalmatch;
                            }

                        }
    
                    }
                    else{
                        console.warn(rpt_perm.resource_set_name + " not present");
                        globalmatch = false;
                        return globalmatch;
                    }
                }); // end rpt_permissions map 

                console.log("permissions match", globalmatch);
                return globalmatch;
            }
            else{
                console.warn("no permissions in rpt");
                return false;
            }
        }
        else{
            console.warn(" no permissions");
            return false;
        }
    }

    if ( typeof module === "object" && module && typeof module.exports === "object" ) {
        module.exports = Ajkeycloak;
    } else {
        window.Ajkeycloak = Ajkeycloak;

        if ( typeof define === "function" && define.amd ) {
            define( "Ajkeycloak", [], function () { return Ajkeycloak; } );
        }
    }

})(window);