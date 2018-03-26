'use strict';
var chai = require('chai');
var expect = chai.expect;
var Ajkeycloak = require('../dist/aj-keycloak.js');
const keycloakconfig = require("../dummykeykloak.json");


describe('#AJKeyloak test suite', function(){
    it('should initialize keycloak with a config',function(){
        var ajkeycloak = Ajkeycloak(keycloakconfig);
        // expect(ajkeycloak).to.contain('init');
        // ajkeycloak.keycloak.init({
        //     onLoad: 'login-required'
        // }).success(function () {
        //     keycloak.loadUserInfo().success(function (userInfo) {
  
        //         console.log('userInfo',userInfo);
        //     })
        //     .error(function(){
        //       alert("error")
        //     });
        // });
                    
    });
});