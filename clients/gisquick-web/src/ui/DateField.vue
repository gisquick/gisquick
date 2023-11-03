<template>
  <v-text-field
    ref="textField"
    class="filled date-field"
    :focused="focused"
    valid-chars="[0-9.]"
    :value="textValue"
    v-bind="$attrs"
    :input-disabled="menuOpened"
    @change="onTextChage"
    @focus="$emit('focus')"
    @blur="$emit('blur')"
  >
    <template v-slot:append>
      <v-menu
        ref="menu"
        aria-label="Vybrať dátum"
        transition="slide-y"
        align="rr;bb,tt"
        content-class="popup-content popup-menu light"
        @closed="menuOpened = false"
      >
        <template v-slot:activator="{ open }">
          <div class="btn" @click="[menuOpened = true, open()]">
            <v-icon name="calendar"/>
          </div>
        </template>
        <template v-slot:menu>
          <v-date-picker
            :min="minDate"
            :max="maxDate"
            :value="date"
            @input="onDateInput"
          />
        </template>
      </v-menu>
    </template>
  </v-text-field>
</template>

<script lang="js">
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import isAfter from 'date-fns/isAfter'

import VDatePicker, { toDate } from '@/ui/DatePicker.vue'
import Focusable from '@/ui/mixins/Focusable'

// function utcToLocalDate (d) {
//   return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
// }

// function localToUtcDate (d) {
//   return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
// }

// const refDate = new Date(2022, 0, 1, 23, 30)
// const refDate = new Date()
// const date1 = parse('01.01.2022', 'dd.MM.yyyy', refDate)
// const date2 = new Date(2022, 0, 1)
// const date3 = new Date(Date.UTC(2022, 0, 1))
// const date4 = utcToLocalDate(date3)
// console.log('---- test -----')

// const dates = [date1, date2, date3, date4]
// dates.forEach(d => {
//   console.log(d, '/', format(d, 'dd.MM.yyyy'))
// })

// console.log('ref', refDate)
// console.log('parsed', date)
// console.log('format', format(date, 'dd.MM.yyyy'))
// console.log('utcToLocalDate', format(utcToLocalDate(date), 'dd.MM.yyyy'))
// console.log('localToUtcDate', format(localToUtcDate(date), 'dd.MM.yyyy'))

export default {
  name: 'DateField',
  mixins: [ Focusable ],
  components: { VDatePicker },
  props: {
    // ISO string or Date
    value: [String, Date],
    min: [String, Date],
    max: [String, Date],
    displayFormat: {
      type: String,
      default: 'dd.MM.yyyy'
    },
    valueFormat: String
  },
  // inheritAttrs: false,
  data () {
    return {
      textValue: '',
      menuOpened: false
    }
  },
  computed: {
    minDate () {
      return this.parseValue(this.min)
    },
    maxDate () {
      return this.parseValue(this.max)
    },
    date () {
      const date = this.parseValue(this.value)
      if (this.isValidDate(date)) {
        if (this.minDate && isAfter(this.minDate, date)) {
          return this.minDate
        }
        if (this.maxDate && isAfter(date, this.maxDate)) {
          return this.maxDate
        }
        return date
      }
      return this.value
    }
  },
  watch: {
    date: {
      immediate: true,
      handler (v) {
        if (this.isValidDate(v)) {
          this.textValue = format(v, this.displayFormat)
        } else if (!v) {
          this.textValue = ''
        }
        if (this.value !== this.formatValue(v)) {
          this.emitValue(v)
          // this.$emit('input', v)
        }
      }
    }
  },
  methods: {
    onTextChage (value) {
      if (value) {
        try {
          const date = parse(value, this.displayFormat, new Date())
          if (this.isValidDate(date)) {
            this.emitValue(date)
          }
        } catch (err) {
          console.error(err)
          this.textValue = this.date ? format(this.date, this.displayFormat) : ''
        }
      } else {
        this.textValue = ''
        this.$emit('input', null)
      }
    },
    onDateInput (v) {
      this.emitValue(v)
      this.$refs.menu.closeMenu()
      this.$refs.textField.focus()
    },
    parseValue (v) {
      if (this.valueFormat) {
        try {
          return parse(v, this.valueFormat, new Date())
        } catch (err) {
          console.error(err)
          return new Date()
        }
      } else {
        return toDate(v)
      }
    },
    formatValue (v) {
      if (v && this.valueFormat) {
        return format(v, this.valueFormat)
      }
      return v
    },
    emitValue (v) {
      this.$emit('input', this.formatValue(v))
    },
    isValidDate (date) {
      try {
        return date && date.getFullYear() > 1000
      } catch (err) {
        return false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.date-field {
  min-width: 130px;
  .btn {
    display: flex;
    opacity: 0.9;
    padding-inline: 3px;
    cursor: pointer;
  }
}
</style>
