(function(win){

    function Ajkeycloak(config){
        if (!(this instanceof Ajkeycloak)) {
            return new Ajkeycloak(config);
        }

        if(Ajkeycloak.instance)
            return this;
        
        Ajkeycloak.instance = this;

        var keycloak = Keycloak(config);
        this.keycloak = keycloak;
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