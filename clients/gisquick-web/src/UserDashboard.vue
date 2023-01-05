<template>
  <div class="user-dashboard f-col">
    <div class="header f-row-ac light shadow-1">
      <div class="f-col mr-2 light">
        <v-text-field class="filled" :placeholder="tr.Search" v-model="filter">
          <template v-slot:append>
            <v-btn v-if="filter" class="icon flat" @click="filter = ''">
              <v-icon name="x"/>
            </v-btn>
            <v-icon v-else name="magnifier" class="mx-2"/>
          </template>
        </v-text-field>
      </div>
      <div class="f-grow"/>
      <div class="username" v-text="user.username"/>
      <v-menu
        align="rr;bb,tt"
        :items="mainMenu"
      >
        <template v-slot:activator="{ toggle }">
          <v-btn
            :aria-label="tr.Menu"
            class="icon round p-1"
            @click="toggle"
          >
            <v-icon name="account" size="24"/>
          </v-btn>
        </template>
      </v-menu>
    </div>

    <div class="content f-col f-grow light">
      <v-spinner
        v-if="loadingProjects"
        class="my-4 mx-auto"
      />

      <div
        v-else-if="sortedProjects.length > 0"
        class="projects-list f-col py-2"
      >
        <div
          v-for="p in sortedProjects"
          :key="p.name"
          class="card"
        >
          <a class="map-link" :href="`/?PROJECT=${p.name}`">
            <img v-if="p.thumbnail" :src="`/api/project/thumbnail/${p.name}`"/>
            <map-img v-else/>
          </a>
          <a :href="`/?PROJECT=${p.name}`" class="project-link f-col px-2">
            <span v-text="p.title" class="title"/>
            <span v-text="p.name" class="name"/>
          </a>
          <div class="details f-row-ac">
            <div class="projection badge">{{ p.projection }}</div>
          </div>
          <div class="time-info f-col">
            <div class="item">
              <translate class="label">Created</translate>
              <span :title="p.created.datetime" v-text="p.created.date"/>
              <!-- <v-icon name="upload" size="18"/> -->
            </div>
            <div class="item">
              <translate class="label">Updated</translate>
              <span :title="p.updated.datetime" v-text="p.updated.date"/>
              <!-- <v-icon name="edit" size="18"/> -->
            </div>
          </div>
          <div class="time-info-m">
            <span>{{ p.created.date }}<template v-if="p.updated.date !== p.created.date"> / {{ p.updated.date }}</template></span>
          </div>
          <div class="badge auth dark">
            <span class="text uppercase" v-text="p.authentication"/>
            <v-icon v-if="p.authentication" :name="authIcons[p.authentication]" size="16"/>
          </div>
        </div>
      </div>

      <div v-else class="empty f-col-ac">
        <translate class="py-4 title">You didn't publish any project yet!</translate>
        <translate tag="p" class="my-4">
          Use QGIS and Gisquick plugin to create your map, and then publish it from your profile page.
        </translate>
        <v-btn
          href="/user/publish/"
          class="inline round"
          color="primary"
        >
          <v-icon name="qgis" class="mr-2"/>
          <translate>Publish project</translate>
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import orderBy from 'lodash/orderBy'
import MapImg from '@/assets/map.svg?inline'
import { sanitize, escapeRegExp, removeDiacritics } from '@/ui/utils/text'

function toDate (v) {
  return typeof v === 'string' ? new Date(v) : v
}
const df = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const dtf = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' })
const tf = new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' })

const dateFormatters = {
  datetime: v => v && dtf.format(toDate(v)),
  date: v => v && df.format(toDate(v)),
  time: v => v && tf.format(toDate(v))
}
function oldApiProjects (data) {
  return data.projects.map(({ project, publication_time, ...rest }) => ({
    name: project,
    created: publication_time,
    ...rest
  }))
}

export default {
  components: { MapImg },
  data () {
    return {
      loadingProjects: false,
      projects: [],
      filter: ''
    }
  },
  computed: {
    ...mapState(['app', 'user']),
    formattedProjects () {
      return this.projects.map(({ created, last_update, ...data }) => ({
        ...data,
        created: this.formatDate(created),
        updated: this.formatDate(last_update)
      }))
    },
    sortedProjects () {
      let projects = this.formattedProjects
      if (this.filter) {
        const regex = new RegExp(escapeRegExp(sanitize(removeDiacritics(this.filter))), 'i')
        projects = projects.filter(p => regex.test(removeDiacritics(p.title)) || regex.test(removeDiacritics(p.name)))
      }
      if (this.sortBy) {
        return orderBy(projects, this.sortBy || 'title', this.sortDir)
      }
      return orderBy(projects, 'title', 'asc')
    },
    authIcons () {
      return {
        private: 'lock',
        public: 'globe',
        users: 'users'
      }
    },
    mainMenu () {
      return [
        {
          key: 'profile',
          text: this.$gettext('My profile'),
          icon: 'settings',
          link: '/user/'
        }, {
          key: 'logout',
          text: this.$gettext('Logout'),
          icon: 'exit_to_app',
          action: this.logout
        }
      ]
    },
    tr () {
      return {
        Menu: this.$gettext('Menu'),
        Search: this.$pgettext('noun', 'Search')
      }
    }
  },
  mounted () {
    this.fetchProjects()
  },
  methods: {
    formatDate (d) {
      return {
        raw: d,
        date: dateFormatters.date(d),
        datetime: dateFormatters.datetime(d)
      }
    },
    logout () {
      this.$http.logout().then(() => location.reload())
    },
    async fetchProjects () {
      this.loadingProjects = true
      try {
        const { data } = await this.$http.get('/api/projects/')
        this.projects = Array.isArray(data) ? data : oldApiProjects(data) // compatibility with old API
      } finally {
        this.loadingProjects = false
      }
    },
    openProject (project) {
      location.search = `PROJECT=${project.name}`
    }
  }
}
</script>

<style lang="scss" scoped>
.header {
  background-color: #ddd;
  border: 1px solid #bbb;
  text-align: left;
  font-size: 15px;
}
.content {
  border: solid #ccc;
  border-width: 0 1px 1px 1px;
  .btn {
    // max-width: 200px;
    align-self: center;
    justify-self: center;
    &.inline {
      // display: inline-flex;
      // height: 24px;
      // margin: 0 6px;
    }
  }
}
.projects-list {
  text-align: left;
  .card {
    display: grid;
    grid-template-columns: 150px 1fr auto;
    gap: 8px;
    padding: 4px 8px;
    margin: 3px 8px 6px 8px;
    background-color: #fff;
  }
  .map-link {
    grid-row: 1 / 3;
    display: flex;
    justify-content: center;
    align-items: center;
    img {
      max-height: 120px;
      max-width: 100%;
      width: auto;
      height: auto;
    }
    svg {
      height: auto;
      max-height: 120px;
    }
  }
  .project-link {
    justify-self: start;
    text-decoration: none;
    color: var(--color-primary);
    .title {
      font-size: 20px;
    }
    .name {
      font-weight: 500;
    }
  }
  .details {
    font-size: 13px;
    font-weight: 500;
    color: #555;
    grid-column: 2 / 3;
  }
  .time-info {
    text-align: right;
    font-size: 13.5px;
    .item {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      .icon {
        margin-left: 4px;
      }
    }
    .label {
      margin-right: 5px;
      font-weight: 500;
      opacity: 0.9;
      &::after {
        content: ":";
      }
    }
  }
  .auth {
    grid-area: 1 / 3 / 2 / 4;
    align-self: start;
    justify-self: end;
    .icon {
      margin-left: 4px;
    }
  }
  @media (min-width: 561px) {
    .time-info-m {
      display: none;
    }
  }
  @media (max-width: 560px) {
    .card {
      grid-template-columns: 100px 1fr auto;
      font-size: 15px;
      gap: 0px;
      padding: 2px;
      margin: 4px 0;
      border-radius: 0;
    }
    .map-link {
      margin-left: 2px;
      align-items: start;
    }
    .project-link {
      grid-area: 1 / 2 / 2 / 3;
      line-height: 1.35;
      .title {
        font-size: 17px;
      }
    }
    .details {
      grid-area: 2 / 2 / 3 / 4;
      align-self: end;
      .badge {
        // margin-bottom: 0;
        font-size: 12px;
      }
    }
    .time-info {
      display: none;
    }
    .time-info-m {
      font-size: 12px;
      grid-area: 2 / 2 / 3 / 4;
      align-self: end;
      justify-self: end;
      margin: 6px 4px;
    }
    .auth.badge {
      background-color: transparent;
      --icon-color: #555;
      padding: 0;
      grid-area: 1 / 3 / 2 / 4;
      margin-inline: 3px;
      .text {
        display: none;
      }
    }
  }
}
p {
  max-width: 400px;
}
.btn.medium {
  height: 30px;
  max-height: 30px;
  font-size: 14px;
}
.empty {
  padding: 24px 12px;
  .title {
    font-size: 20px;
    font-weight: 500;
  }
}
.badge {
  padding: 1px 6px;
  margin: 6px;
  color: #fff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  &.projection {
    background-color: #626262;
  }
  &.auth {
    background-color: var(--color-green);
    text-transform: uppercase;
    font-size: 13px;
    font-weight: 500;
  }
}
</style>
