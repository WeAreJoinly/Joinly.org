var app = angular.module('joinly', ['ngRoute']);

app.config(function($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'templates/login.html',
        controller: 'loginCtrl'
    })
    .when('/signup', {
    		templateUrl: 'templates/signup.html',
    		controller: 'signupCtrl'
    })
    .otherwise({
    		redirectTo: '/'
    });
});

app.controller('loginCtrl', function($scope) {
  $scope.user = {};
  var userInputData = $scope.user;

  $scope.login = function(){
    if(firebase.auth().currentUser){
      //Already signed in
      Materialize.toast('Already in!', 3000);
    }else{
      firebase.auth().signInWithEmailAndPassword(userInputData.email || "", userInputData.password || "").catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        Materialize.toast('Wrong email or password!', 3000);
      });
      firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          // User is signed in.
          Materialize.toast('Success!', 3000)
        } else {
          // No user is signed in.
        }
      });
    }
  }
});

app.controller('signupCtrl', function($scope) {
  $scope.user = {};
  var userInputData = $scope.user;
  
  $('.paymentMethodDropdown').dropdown({
    inDuration: 300,
    outDuration: 225,
    constrain_width: false,
    belowOrigin: false,
    alignment: 'left'
  });

  $scope.paymentMethod = function(method){
    alert(method);

    switch (method) {
      case "card":
        $scope.user.paymentMathod = "Credit Card";
        break;
      case "paypal":
        $scope.user.paymentMathod = "PayPal";
        break;
      case "ebilling":
        $scope.user.paymentMathod = "Email billing";
        break;
    }
  }

});
