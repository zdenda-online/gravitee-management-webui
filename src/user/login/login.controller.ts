/*
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import UserService from '../../services/user.service';
import {StateParams, StateService} from '@uirouter/core';
import { IScope } from 'angular';
import { StateService } from '@uirouter/core';
import { User } from '../../entities/user';
import RouterService from '../../services/router.service';
import * as _ from 'lodash';
import { IdentityProvider } from '../../entities/identityProvider';
import AuthenticationService from '../../services/authentication.service';
import ReCaptchaService from '../../services/reCaptcha.service';

class LoginController {
  user: any = {};
  userCreationEnabled: boolean;
  localLoginDisabled: boolean;

  constructor(
    private AuthenticationService: AuthenticationService,
    private UserService: UserService,
    private $state: StateService,
    private Constants,
    private $rootScope: IScope,
    private RouterService: RouterService,
    private identityProviders,
    private $window,
    private $stateParams: StateParams,
    private $scope,
    private ReCaptchaService: ReCaptchaService,
  ) {
    'ngInject';
    this.userCreationEnabled = Constants.portal.userCreation.enabled;
    this.localLoginDisabled = (!Constants.authentication.localLogin.enabled) || false;
    this.$state = $state;
    this.$rootScope = $rootScope;
    this.$scope = $scope;
    $scope.canBeDisabled = false;
  }

  $onInit() {
    document.addEventListener('click', this._toDisabledMode);
    this.ReCaptchaService.execute('login').then((ReCaptchaToken) => {
      this.user.ReCaptchaToken = ReCaptchaToken;
    });
  }

  $onDestroy() {
    document.removeEventListener('click', this._toDisabledMode);
  }

  authenticate(identityProvider: string) {
    let nonce = this.AuthenticationService.nonce(32);

    this.$window.localStorage[nonce] = JSON.stringify({ redirectUri: this.$stateParams.redirectUri });

    let provider = _.find(this.identityProviders, {'id': identityProvider}) as IdentityProvider;
    this.AuthenticationService.authenticate(provider, nonce);
  }

  _toDisabledMode = () => {
    this.$scope.canBeDisabled = true;
    this.$scope.$apply();
    document.removeEventListener('click', this._toDisabledMode);
  }

  login() {
    this.UserService.login(this.user).then(() => {
      this.UserService.current().then((user) => {
        this.loginSuccess(user);
      });
    }).catch(() => {
      this.user.username = '';
      this.user.password = '';
    });
  }

  loginSuccess(user: User) {
    this.$rootScope.$broadcast('graviteeUserRefresh', {'user': user});

    if (this.$state.params.redirectUri) {
      this.$window.location.href = '#!' + this.$state.params.redirectUri;
    } else {
      let route = this.RouterService.getLastRoute();
      if (route.from && route.from.name !== '' && route.from.name !== 'logout' && route.from.name !== 'confirm' && route.from.name !== 'resetPassword') {
        this.$state.go(route.from.name, route.fromParams);
      } else {
        this.$state.go('portal.home');
      }
    }
  }
}

export default LoginController;
