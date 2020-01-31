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
import { StateService } from "@uirouter/core";
import { IdentityProvider } from "../../../entities/identityProvider";
import IdentityProviderService from "../../../services/identityProvider.service";
import NotificationService from "../../../services/notification.service";
import PortalConfigService from "../../../services/portalConfig.service";
import _ = require("lodash");
import {IScope, material} from "angular";
import UserService from "../../../services/user.service";

const IdentityProvidersComponent: ng.IComponentOptions = {
  bindings: {
    identityProviders: "<"
  },
  template: require("./identity-providers.html"),
  controller: function(
    $mdDialog: angular.material.IDialogService,
    IdentityProviderService: IdentityProviderService,
    PortalConfigService: PortalConfigService,
    NotificationService: NotificationService,
    UserService: UserService,
    $state: StateService,
    Constants,
    $rootScope: IScope
  ) {
    "ngInject";
    this.$rootScope = $rootScope;
    this.settings = _.cloneDeep(Constants);

    this.currentUserSource = UserService.currentUser.source;
    this.availableProviders = [
      {"name": "Gravitee.io AM", "icon": "perm_identity", "type": "graviteeio_am"},
      {"name": "Google", "icon": "google-plus", "type": "google"},
      {"name": "GitHub", "icon": "github-circle", "type": "github"},
      {"name": "LDAP", "icon": "group", "type": "ldap"},
      {"name": "OpenID Connect", "icon": "perm_identity", "type": "oidc"}
    ];

    this.$onInit = () => {
      this.socialIdentityProviders = _.filter(this.identityProviders, idp => idp.type === "github" || idp.type === "google" || idp.type === "graviteeio_am" || idp.type === "oidc");
      this.internalIdentityProviders = _.filter(this.identityProviders, idp => idp.type === "memory" || idp.type === "gravitee" || idp.type === "ldap");
    };

    this.create = (type) => {
      $state.go("management.settings.identityproviders.new", {type: type});
    };

    this.delete = (provider: IdentityProvider) => {
      if (this.currentUserSource === provider.id) {
        var alert = $mdDialog.alert()
          .title("Attention")
          .textContent("Deleting this identity provider is forbidden since you have been authenticated with")
          .ok("Close");

        $mdDialog.show(alert);
      } else {
        let that = this;
        $mdDialog.show({
          controller: "DialogConfirmController",
          controllerAs: "ctrl",
          template: require("../../../components/dialog/confirmWarning.dialog.html"),
          clickOutsideToClose: true,
          locals: {
            title: "Are you sure you want to delete this identity provider ?",
            msg: "",
            confirmButton: "Delete"
          }
        }).then(function (response) {
          if (response) {
            IdentityProviderService.delete(provider).then(response => {
              NotificationService.show("Identity provider '" + provider.name + "' has been deleted");
              $state.go("management.settings.identityproviders.list", {}, {reload: true});
            });
          }
        });
      }
    };

    this.saveForceLogin = () => {
      PortalConfigService.save({
        authentication: {
          forceLogin: {
            enabled: this.settings.authentication.forceLogin.enabled
          }
        }
      }).then( response => {
        NotificationService.show("Authentication is now " + (this.settings.authentication.forceLogin.enabled ? "mandatory" : "optional") );
      });
    };

    this.saveShowLoginForm = () => {
      PortalConfigService.save({
        authentication: {
          localLogin: {
            enabled: this.settings.authentication.localLogin.enabled
          }
        }
      }).then( response => {
        NotificationService.show("Login form is now " + (this.settings.authentication.localLogin.enabled ? "enabled" : "disabled"));
      });
    };

    this.changeIdentityProviderStatus = (identityProvider: IdentityProvider, newStatus: boolean) => {
      if (this.currentUserSource === identityProvider.id) {
        var alert = $mdDialog.alert()
          .title("Attention")
          .textContent("Disabling this identity provider is forbidden since you have been authenticated with")
          .ok("Close");

        $mdDialog.show(alert);
      } else {
        IdentityProviderService.get(identityProvider.id).then(response => {
          let idp: IdentityProvider = response;
          idp.enabled = newStatus;
          IdentityProviderService.update(idp).then(response => {
            NotificationService.show("Identity provider '" + idp.name + "' has been updated");
            identityProvider.enabled = newStatus;
          });
        });
      }
    };

    this.upward = (identityProvider: IdentityProvider) => {
      IdentityProviderService.get(identityProvider.id).then(response => {
        let idp: IdentityProvider = response;
        idp.order = idp.order - 1;
        IdentityProviderService.update(idp).then(response => {
          NotificationService.show("Identity provider '" + idp.name + "' order has been changed with success");
          this.refresh();
        });
      });
    };

    this.downward = (identityProvider: IdentityProvider) => {
      IdentityProviderService.get(identityProvider.id).then(response => {
        let idp: IdentityProvider = response;
        idp.order = idp.order + 1;
        IdentityProviderService.update(idp).then(response => {
          NotificationService.show("Identity provider '" + idp.name + "' order has been changed with success");
          this.refresh();
        });
      });
    };

    this.refresh = () => {
      IdentityProviderService.list().then(response => this.identityProviders = response);
    };
  }
};

export default IdentityProvidersComponent;
