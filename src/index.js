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
                            if(json.rpt)
                                deferred.resolve( Ajkeycloak.instance.jwtDecode(json.rpt) );
                            else
                                deferred.resolve(json);
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

    if ( typeof module === "object" && module && typeof module.exports === "object" ) {
        module.exports = Ajkeycloak;
    } else {
        window.Ajkeycloak = Ajkeycloak;

        if ( typeof define === "function" && define.amd ) {
            define( "Ajkeycloak", [], function () { return Ajkeycloak; } );
        }
    }

})(window);