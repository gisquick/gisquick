 <template>
  <div class="mx-2">
    <time-field
      :min="range.min"
      :max="range.max"
      v-model="time[0]"
      mask="YYYY-MM-DD"
      label="From"
    />

    <time-field
      :min="time[0]"
      :max="range.max"
      v-model="time[1]"
      mask="YYYY-MM-DD"
      label="To"
    />

<!--     <range-slider
      :min="range.min"
      :max="range.max"
      :fixed="fixed"
      v-model="time"
      hide-details
    /> -->
    <f-range-slider
      :min="range.min"
      :max="range.max"
      v-model="time"
      :fixed="fixed"
      class="mx-2"
      hide-details
    />
    <v-checkbox
      color="primary"
      label="Fixed range"
      v-model="fixed"
      hide-details
    />
  </div>
</template>

<script>
import moment from 'moment'
import TimeField from './TimeField'
import RangeSlider from './RangeSlider1'
import './RangeSlider3' // gobally registred 'f-range-slider'

function unixTime (time) {
  return moment(time, 'YYYY-MM-DD').unix()
}

let state = null

export default {
  components: { TimeField, RangeSlider },
  data () {
    return state || {
      fixed: false,
      range: {
        min: unixTime('2018-06-03'),
        max: unixTime('2018-08-05')
      },
      time: [
        unixTime('2018-06-15'),
        unixTime('2018-07-15')
      ]
    }
  },
  beforeDestroy () {
    state = this.$data
  }
}
</script>
