<template>
  <v-app id="app">
    <Map v-if="project" :project="project"></Map>
    <LoginDialog v-if="showLogin" @login="bootstrap" />
    <SelectProjectDialog v-if="showProjects" :projects="projects" />
  </v-app>
</template>

<script>
import HTTP from './client'
import Map from './components/Map'
import LoginDialog from './components/LoginDialog'
import SelectProjectDialog from './components/SelectProjectDialog'

export default {
  name: 'app',
  components: { Map, LoginDialog, SelectProjectDialog },
  data: () => ({
    showProjects: false,
    showLogin: false,
    project: null
  }),
  mounted () {
    this.bootstrap()
  },
  methods: {
    bootstrap () {
      let project = new URLSearchParams(location.search).get('PROJECT')
      // project = 'user1/prague/prague'
      if (project) {
        HTTP
          .project(project)
          .then(resp => {
            this.project = resp.data
          })
          .catch(resp => {
            this.showLogin = true
          })
      } else {
        // Show list of user projects
        HTTP.get('/projects.json')
          .then((resp) => {
            this.projects = resp.data.projects
            this.showProjects = true
          })
          .catch(resp => {
            this.showLogin = true
          })
      }
    }
  }
}
</script>

<style lang="scss">
@import './theme.scss';

html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  font-size: 1em;
  overflow: hidden;
}
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  height: 100%;
}

.btn.btn--icon {
  .btn__content:before {
    /*border-radius: 0;*/
    display: none;
  }
}
.checkbox {
  .input-group--selection-controls__ripple {
    display: none;
  }
}

.theme--light .icon {
  color: currentColor;
}

.tabs__div a {
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
  user-drag: none;
}

.tabs__container--icons-and-text {
  height: 3em;

  .tabs__div {
    min-width: 33%;
    font-size: 0.75rem;
    position: relative;

    .tabs__item {
      padding: 0;
      text-transform: none;
      font-weight: 400;
      &.tabs__item--active {
        color: $primary-color;
        .icon {
          color: $primary-color;
        }
      }
      .icon {
        width: 20px;
        height: 20px;
        margin-bottom: 2px;
        color: #333;
      }
    }
    &:not(:last-child):after {
      content: "";
      position: absolute;
      right: 0;
      top: 20%;
      bottom: 30%;
      width: 1px;
      background-color: #ccc;
    }
  }
}

.slide-enter-active, .slide-leave-active {
  transition: transform .4s cubic-bezier(.25,.8,.5,1);
}
.slide-enter, .slide-leave-to {
  transform: translate3d(-100%, 0, 0);
}

</style>
