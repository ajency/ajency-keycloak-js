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

            this.keycloak.updateToken(5).success(function(refreshed){
                let url = this.CONFIG['url'] + '/realms/' + this.CONFIG['realm'] + '/authz/entitlement/' + this.CONFIG['clientId'];
                this.makeRequest(
                        url, 
                        'POST',
                        entitlements,
                        {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + this.keycloak.token
                        }
                    )
                    .then(function(res){
                        console.log("make request success", res)
                        deferred.resolve(res);
                    })
                    .catch(function(err){
                        console.warn("make request error: ", err);
                        deferred.reject(err);
                    });    
              })
              .error(function(err){
                deferred.reject(err);
              });

        }
        else{  // default authorization
            if(this.keycloak.authenticated){
                console.log("success fully authenticalted")
                deferred.resolve();
            }
            else{
                console.warn("not authenticalted")
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
                    deferred.resolve(this);
                }
                else{
                    deferred.reject(this);
                }
            }
          };


        request.send(method === 'POST' ? querystring : '');
        
        return deferred.promise;
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