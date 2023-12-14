<template>
  <div class="app">
    <div class="bg-logo"/>
    <div class="spacer"/>
    <div class="content">
      <text-logo class="text-logo" height="50" width="300"/>
      <slot>
        <template v-if="status === 503">
          <h1>We'll be back soon!</h1>
          <div class="msg my-4">
            <p>
              Sorry for the inconvenience but we're performing some maintenance at the moment.
              If you need to you can always <a href="mailto:info@opengeolabs.cz">contact us</a>,
              otherwise we'll be back online shortly!
            </p>
            <br/>
            <p>&mdash; The Gisquick Team</p>
          </div>
        </template>
        <template v-else>
          <h1 class="error f-row-ac">
            <v-icon name="warning" color="red" size="36" class="mr-2"/>
            <span>Server Error</span>
          </h1>
          <div class="msg f-col-ac">
            <p class="my-4">
              The server encountered an unexpected condition that prevented it from fulfilling the request.
              Please try again later or <a href="mailto:info@opengeolabs.cz">contact us</a>
            </p>
            <v-btn class="round n-case my-4" color="green" @click="reload">Try Again</v-btn>
          </div>
        </template>
      </slot>
    </div>
    <div class="spacer"/>
    <div class="spacer"/>
  </div>
</template>

<script>
import TextLogo from '@/assets/text_logo_dark.svg?inline'

export default {
  components: {
    TextLogo
  },
  props: {
    status: Number
  },
  methods: {
    reload () {
      window.location.reload()
    }
  }
}
</script>

<style lang="scss" scoped>
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 320px;
  min-height: 100vh;
  background-color: #111;

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    box-sizing: border-box;
    max-width: 640px;
    color: #fff;
    text-shadow: 0px 1px 4px #111;

    @media (max-width: 640px) {
      min-width: 0;
      max-width: 100%;
      padding: 0 6px;
    }
    > h1 {
      font-size: 36px;
      font-weight: 600;
      line-height: 1.1;
      text-align: center;
      margin: 16px 4px;
      &.error {
        color: var(--color-red);
      }
    }
  }
  .text-logo {
    max-width: 90vh;
    margin: 8px 12px;
  }
  .msg {
    font-size: 20px;
  }
  a {
    color: #dc8100;
    text-decoration: none;
    text-shadow: 0px 1px 1px #333;
  }
  a:hover {
    color: #c57300;
    text-decoration: none;
  }
  .bg-logo {
    background-image: url(@/assets/image_logo.svg);
    background-repeat: no-repeat;
    background-position-x: left;
    background-position-y: center;
    background-size: auto clamp(500px, 90%, 900px);
    position: absolute;
    right: 0;
    width: 100%;
    height: 100%;
    max-width: 25vw;
    z-index: 0;
    opacity: 0.9;
    @media (max-width: 720px) {
      display: none;
    }
  }
  .btn.n-case {
    text-transform: none;
  }
  .spacer {
    flex: 1 1;
  }
}
</style>
