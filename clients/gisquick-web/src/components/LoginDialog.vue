<template>
  <v-dialog
    fullscreen scrollable
    :value="value"
    content-class="login-dialog"
  >
    <div class="bg-logo-container">
      <img src="../assets/image_logo.svg">
    </div>
    <v-container>
      <v-card dark color="transparent">
        <v-layout column class="header">
          <img class="logo" src="../assets/login_text_logo.svg">
          <h3><translate>Sign In to Continue</translate></h3>
        </v-layout>

        <v-card-text class="pb-1">
          <p
            v-if="permissionDenied"
            class="text-xs-center red--text"
            key="permission"
          >
            <translate>Permission denied</translate>
          </p>
          <p
            v-if="authenticationError"
            class="text-xs-center red--text"
            key="error"
          >
            {{ authenticationError }}
          </p>
          <form v-if="forgotPassword" @submit.prevent>
            <div
              class="note"
              :class="{'red--text': passwordResetError}"
            >
              <v-icon v-if="passwordResetError" class="red--text">error</v-icon>
              <v-icon v-if="passwordResetSuccess">check_circle</v-icon>
              <span>{{ passwordResetText }}</span>
            </div>
            <v-text-field
              name="email"
              type="email"
              autocomplete="email"
              :label="tr.Email"
              v-model="email"
              placeholder=" "
              @keyup.enter="resetPassword"
            />
            <v-btn
              key="reset-btn"
              color="grey lighten-3"
              class="mx-0"
              :light="!!email && !passwordResetSuccess"
              :disabled="!email || passwordResetSuccess"
              @click="resetPassword"
            >
              <translate>Reset Password</translate>
            </v-btn>
          </form>
          <form v-else>
            <v-text-field
              name="username"
              v-model="username"
              :label="tr.Username"
              placeholder=" "
              @keyup.enter="login"
              autofocus
            />
            <v-text-field
              name="password"
              v-model="password"
              :label="tr.Password"
              placeholder=" "
              :append-icon="passwordVisible ? 'visibility' : 'visibility_off'"
              @click:append="passwordVisible = !passwordVisible"
              :type="passwordVisible ? 'text' : 'password'"
              @keyup.enter="login"
            />
            <v-btn
              color="grey lighten-3"
              class="mx-0"
              light
              @click="login"
            >
              <translate>Login</translate>
            </v-btn>
          </form>
        </v-card-text>
        <v-layout class="row footer mx-3">
          <v-btn
            v-if="!loginRequired"
            @click="$emit('close')"
            color="grey"
            flat
          >
            <translate>Continue as Guest</translate>
          </v-btn>
          <v-spacer/>
          <v-btn
            v-if="passwordResetUrl"
            @click="forgotPassword = !forgotPassword"
            color="grey"
            flat
          >
            <translate v-if="forgotPassword">Back to Login</translate>
            <translate v-else key="forgot">Forgot password?</translate>
          </v-btn>
        </v-layout>
      </v-card>
    </v-container>
  </v-dialog>
</template>

<script>
// chrome autofill behaviour can be troublemaker:
// https://bugs.chromium.org/p/chromium/issues/detail?id=669724
export default {
  name: 'LoginDialog',
  props: {
    value: Boolean,
    loginRequired: Boolean,
    permissionDenied: Boolean,
    passwordResetUrl: String
  },
  data () {
    return {
      formErrors: {},
      authenticationError: '',
      username: '',
      password: '',
      email: '',
      passwordVisible: false,
      passwordResetSuccess: false,
      passwordResetError: false,
      forgotPassword: false
    }
  },
  computed: {
    tr () {
      return {
        Username: this.$gettext('Username'),
        Password: this.$gettext('Password'),
        Email: this.$gettext('Email'),
        PasswordResetInfo: this.$gettext(
          'Enter your email address below and we will email instructions for setting a new password.'
        ),
        PasswordResetError: this.$gettext('Failed to process your request.'),
        PasswordResetSuccess: this.$gettext('Email was sent to given email address.')
      }
    },
    passwordResetText () {
      if (this.passwordResetError) {
        return this.errors.email || this.tr.PasswordResetError
      } else if (this.passwordResetSuccess) {
        return this.tr.PasswordResetSuccess
      }
      return this.tr.PasswordResetInfo
    }
  },
  methods: {
    login () {
      this.$http.login(this.username, this.password)
        .then(resp => {
          this.authenticationError = null
          this.$emit('login', resp.data)
        })
        .catch(resp => {
          this.authenticationError = this.$gettext('Authentication failed')
        })
    },
    resetPassword () {
      this.$http.post(this.passwordResetUrl, { email: this.email })
        .then(() => {
          this.passwordResetSuccess = true
          this.passwordResetError = false
        })
        .catch(err => {
          this.passwordResetError = true
          this.passwordResetSuccess = false
          if (err.response && err.response.data.email) {
            this.errors = err.response.data
          }
        })
    }
  }
}
</script>

<style lang="scss" scoped>
/deep/ .login-dialog {
  background-color: black;
  .v-card {
    max-width: 400px;

    .header {
      justify-content: center;
      align-items: center;
      .logo {
        width: 80%;
        margin-bottom: 1em;
      }
      h3, h4 {
        margin: 0.5em 0;
        font-weight: 400;
      }
      h4 {
        opacity: 0.5;
      }
    }

    form {
      border: 2px dashed #444;
      padding: 0.5em 1em;
      display: flex;
      flex-direction: column;
      .input-group label:after {
        /* Remove asterics from required fields */
        display: none;
      }
      .btn {
        margin: 0.25em 0;
      }
      input:-webkit-autofill {
        -webkit-box-shadow: 0 0 0px 1000px #000 inset;
        -webkit-text-fill-color: #fff
      }
      .note {
        font-size: 90%;
        opacity: 0.8;
        margin: 8px 0;
        height: 52px;
        .v-icon {
          font-size: 20px;
          margin-right: 6px;
        }
      }
      .v-icon {
        user-select: none;
      }
    }
    .footer {
      .v-btn {
        text-transform: none;
      }
    }
  }

  .bg-logo-container {
    position: absolute;
    overflow: hidden;
    top: 0;
    bottom: 0;
    left: calc(400px + (100% - 400px)/ 2);
    width: calc((100% - 400px)/ 2);
    img {
      position: absolute;
      height: 100%;
      left: 40%;
      top: 0;
    }
  }
}
</style>
