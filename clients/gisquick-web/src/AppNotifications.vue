<template>
  <v-dialog title="Notifications" :value="!!notification" persistent>
    <div v-if="notification" class="notification f-col">
      <span class="title p-2" v-text="notification.title"/>
      <hr/>
      <div class="content p-2" v-html="notification.msg"/>
      <hr/>
      <div class="f-row-ac">
        <v-checkbox :label="tr.DoNotShowAgain" v-model="dontShowAgain"/>
        <span class="f-grow"/>
        <v-btn
          color="primary"
          class="small"
          @click="confirmNotification"
        >
          <translate v-if="notificationIndex < notifications.length - 1" key="next" translate-context="adverb">Next</translate>
          <translate v-else key="close">Close</translate>
        </v-btn>
      </div>
    </div>
  </v-dialog>
</template>

<script>
import { mapState } from 'vuex'
import { set, get } from 'idb-keyval'

export default {
  props: {
    notifications: Array
  },
  data () {
    return {
      notificationIndex: 0,
      dontShowAgain: false,
      confirmedNotifications: null
    }
  },
  computed: {
    ...mapState(['user']),
    activeNotifications () {
      if (this.confirmedNotifications) {
        const notifications = this.notifications ?? []
        return notifications.filter(n => !this.confirmedNotifications.includes(`${this.user.username}:${n.id}`))
      }
      return []
    },
    notification () {
      return this.activeNotifications[this.notificationIndex]
    },
    tr () {
      return {
        DoNotShowAgain: this.$gettext("Don't show this message again")
      }
    }
  },
  async created () {
    const confirmedNotifications = await get('confirmed-notifications') || []
    // remove notifications older than threshold limit as cleanup routine
    const day = 24 * 60 * 60
    const limit = (new Date().getTime() / 1000) - 30 * day // in seconds
    this.confirmedNotifications = confirmedNotifications.filter(key => parseInt(key.split(':')?.[1]) > limit)
  },
  methods: {
    async confirmNotification () {
      if (this.dontShowAgain) {
        set('confirmed-notifications', [`${this.user.username}:${this.notification.id}`, ...this.confirmedNotifications])
        this.dontShowAgain = false
      }
      this.notificationIndex++
    }
  }
}
</script>

<style lang="scss" scoped>
.notification {
  min-width: 300px;
  .title {
    font-weight: 500;
    font-size: 16px;
    line-height: 1.25;
    // background-color: #ddd;
    background-color: #333;
    // background-color: var(--color-primary);
    color: #fff;
  }
  --border-color: #e2e2e2;
  // ::v-deep a {
  //   color: var(--color-primary);
  //   text-decoration: none;
  // }
}
</style>
