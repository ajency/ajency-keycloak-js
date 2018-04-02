# ajency-keycloak-js

A wrapper library for keycloak javscript adapter with some additional functionality.

## Installation

`npm install --save https://github.com/ajency/ajency-keycloak-js.git`

## Basic Usage

```
  bootstrapApp(){
    // boostrapping code for your front end app
  }

  var ajkeycloak = Ajkeycloak(<keycloak-installation-json>);
  
  ajkeycloak.keycloak.init({
      onLoad: 'login-required'
  }).success(function () {
    ajkeycloak.keycloak.loadUserInfo().success(function (userInfo) {
            bootstrapApp();
      })
      .error(function(error){
        alert(error);
      });
  });
```

## Tests

  `npm run test`

## Contributing

In lieu of a formal style guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code.
