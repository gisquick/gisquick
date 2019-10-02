<template>
  <v-dialog v-model="open" scrollable max-width="350px">
    <v-card>
      <v-card-title>Select Project</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-radio-group v-model="selected">
          <v-radio
            v-for="project in projects"
            color="primary"
            :key="project.project"
            :label="project.title"
            :value="project.project">
          </v-radio>
        </v-radio-group>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          raised
          color="primary"
          :disabled="!selected"
          @click="selectProject">Open</v-btn>
        <v-spacer></v-spacer>
        <!-- <v-btn raised @click="open=false">Close</v-btn> -->
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'select-project-dialog',
  props: ['projects'],
  data () {
    return {
      open: true,
      selected: ''
    }
  },
  methods: {
    selectProject () {
      location.search = `PROJECT=${this.selected}`
    }
  }
}
</script>

<style scoped>
  .input-group {
    padding-top: 0;
  }
</style>
