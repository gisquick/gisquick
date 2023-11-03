<template>
  <div class="datepicker">
    <div class="header">
      <!-- previous segment -->
      <v-btn
        class="prev"
        :disabled="prevDisabled"
        @click="prevSegment"
      >
        <v-icon name="arrow-right"/>
      </v-btn>
      <div class="f-row f-grow f-justify-center">
        <v-btn v-text="titleMonth" @click="view = 'MONTH'"/>
        <v-btn v-text="titleYear" @click="view = 'YEAR'"/>
      </div>
      <!-- next segment -->
      <v-btn
        class="icon next"
        :disabled="nextDisabled"
        @click="nextSegment"
      >
        <v-icon name="arrow-right"/>
      </v-btn>
    </div>
    <div v-if="view === 'DAY'" class="grid days">
      <span
        v-for="day in headers.days"
        :key="day"
        class="label"
        v-text="day"
      />
      <button
        v-for="(day, index) in days"
        :key="`day-${index}`"
        v-text="day.text"
        :class="{
          leading: day.leading,
          selected: day.key === selected,
          current: day.key === todayKey,
          out: !day.inRange
        }"
        :disabled="!day.inRange"
        @click="updateValue(day)"
      />
      <div v-for="(_, i) in paddingDays" :key="`p${i}`" class="padding"/>
    </div>
    <div v-else-if="view === 'MONTH'" class="grid months">
      <button
        v-for="(month, index) in months"
        :key="`month-${month.key}`"
        v-text="month.text"
        :class="{
          selected: month.selected,
          current: month.current
        }"
        :disabled="!month.inRange"
        @click="updateMonth(index)"
      />
    </div>
    <div v-else-if="view === 'YEAR'" class="grid years">
      <button
        v-for="(year) in years"
        :key="`year-${year.key}`"
        v-text="year.text"
        :class="{
          selected: year.selected,
          current: year.current
        }"
        :disabled="!year.inRange"
        @click="updateYear(year.key)"
      />
    </div>
  </div>
</template>

<script lang="js">
import last from 'lodash/last'
import isAfter from 'date-fns/isAfter'
import addDays from 'date-fns/addDays'
import subDays from 'date-fns/subDays'
import addMonths from 'date-fns/addMonths'
import subMonths from 'date-fns/subMonths'
import parseISO from 'date-fns/parseISO'
import getYear from 'date-fns/getYear'
import getMonth from 'date-fns/getMonth'
import endOfMonth from 'date-fns/endOfMonth'
import startOfMonth from 'date-fns/startOfMonth'

export function toDate (v) {
  if (v) {
    if (typeof v === 'string') {
      v = parseISO(v)
    }
    if (v.getHours() !== 0 || v.getMinutes() !== 0 || v.getSeconds() !== 0 || v.getMilliseconds() !== 0) {
      v = new Date(v.getTime())
      v.setHours(0, 0, 0, 0)
    }
  }
  return v
}

function parseDate (date) {
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear()
  }
}

function stringify (date) {
  const { day, month, year } = parseDate(date)
  return `${day}.${month}.${year}`
}

export default {
  name: 'DatePicker',
  props: {
    // ISO string or Date
    value: [String, Date],
    min: [String, Date],
    max: [String, Date]
  },
  data () {
    return {
      current: null,
      view: 'DAY',
      yearViewRange: {
        from: null,
        to: null
      }
    }
  },
  computed: {
    minDate () {
      return toDate(this.min)
    },
    maxDate () {
      return toDate(this.max)
    },
    today () {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      return d
    },
    todayKey () {
      return stringify(this.today)
    },
    todayMonth () {
      return getMonth(this.today) + 1
    },
    todayYear () {
      return getYear(this.today)
    },
    dateValue () {
      return toDate(this.value) || this.today
    },
    selected () {
      return this.value && stringify(toDate(this.value))
    },
    headers () {
      return {
        days: [
          this.$gettext('Monday'),
          this.$gettext('Tuesday'),
          this.$gettext('Wednesday'),
          this.$gettext('Thursday'),
          this.$gettext('Friday'),
          this.$gettext('Saturday'),
          this.$gettext('Sunday')
        ].map(t => t.substring(0, 3)),
        months: [
          this.$gettext('January'),
          this.$gettext('February'),
          this.$gettext('March'),
          this.$gettext('April'),
          this.$gettext('May'),
          this.$gettext('June'),
          this.$gettext('July'),
          this.$gettext('August'),
          this.$gettext('September'),
          this.$gettext('October'),
          this.$gettext('November'),
          this.$gettext('December')
        ]
      }
    },
    titleMonth () {
      const { month } = this.current
      return this.headers.months[month - 1]
    },
    titleYear () {
      return this.current.year
    },
    title () {
      const { month, year } = this.current
      return `${this.headers.months[month - 1]} ${year}`
    },
    leadingDays () {
      const staDay = 1 // 0: sunday
      const { month, year } = this.current
      const firstWeekday = new Date(year, month - 1, 1).getDay()

      const days = (firstWeekday + 7) - (staDay + 7) - 1
      const ret = []
      for (let i = -days; i <= 0; i++) {
        const d = new Date(year, month - 1, i)
        ret.push({
          key: stringify(d),
          text: d.getDate(),
          date: d,
          leading: true,
          inRange: !this.isOutOfRange(d)
        })
      }
      return ret
    },
    monthDays () {
      const ret = []
      const { month, year } = this.current
      const lastDay = new Date(year, month, 0).getDate()
      for (let i = 1; i <= lastDay; i++) {
        const d = new Date(year, month - 1, i)
        ret.push({
          key: stringify(d),
          text: i,
          date: d,
          inRange: !this.isOutOfRange(d)
        })
      }
      return ret
    },
    days () {
      return this.leadingDays.concat(this.monthDays)
    },
    paddingDays () {
      const minSize = 36 - this.days.length
      return minSize > 0 ? new Array(minSize).fill(0) : []
    },
    prevDisabled () {
      if (this.minDate && this.days.length && this.view === 'DAY') {
        const date = subDays(this.days[0].date, 1)
        return isAfter(this.minDate, date)
      }
      return false
    },
    nextDisabled () {
      if (this.maxDate && this.days.length && this.view === 'DAY') {
        const date = addDays(last(this.days).date, 1)
        return isAfter(date, this.maxDate)
      }
      return false
    },
    months () {
      return this.headers.months.map((m, i) => {
        const { month, year } = this.current
        return {
          key: i,
          text: m.substring(0,3),
          selected: i + 1 === month,
          current: i + 1 === this.todayMonth && year === this.todayYear,
          inRange: !this.isMonthOutOfRange(i + 1, year)
        }
      })
    },
    years () {
      const { from, to } = this.yearViewRange
      const actualYear = getYear(new Date())
      let ret = []
      for(let i = from; i < to; i++) {
        ret.push({
          key: i,
          text: i,
          selected: i === this.current.year,
          current: i === actualYear,
          inRange: !this.isYearOutOfRange(i)
        })
      }
      return ret
    }
  },
  created () {
    this.setCurrent(this.dateValue)
    const year = getYear(this.dateValue)
    this.yearViewRange.from = year - 9
    this.yearViewRange.to = year + 7
  },
  methods: {
    setCurrent (date) {
      this.current = {
        month: date.getMonth() + 1,
        year: date.getFullYear()
      }
    },
    prevMonth () {
      const { month, year } = this.current
      this.setCurrent(new Date(year, month - 2, 1))
    },
    nextMonth () {
      const { month, year } = this.current
      this.setCurrent(new Date(year, month, 1))
    },
    prevSegment () {
      if (this.view === 'DAY') {
        this.prevMonth()
      } else {
        this.yearViewRange.from--
        this.yearViewRange.to--
        if (this.view === 'MONTH') {
          this.setCurrent(new Date(this.current.year - 1, this.current.month - 1 , 1))
        }
      }
    },
    nextSegment () {
      if (this.view === 'DAY') {
        this.nextMonth()
      } else {
        this.yearViewRange.from++
        this.yearViewRange.to++
        if (this.view === 'MONTH') {
          this.setCurrent(new Date(this.current.year + 1, this.current.month - 1 , 1))
        }
      }
    },
    updateValue (cell) {
      this.$emit('input', cell.date)
    },
    isOutOfRange (date) {
      return ((this.minDate && isAfter(this.minDate, date)) || (this.maxDate && isAfter(date, this.maxDate)))
    },
    isMonthOutOfRange (i, year) {
      const comparedDate = new Date(year, i, 1)
      const minValue = this.minDate ? endOfMonth(subMonths(this.minDate, 1)) : null
      const maxValue = this.maxDate ? startOfMonth(addMonths(this.maxDate, 1)) : null
      return ((minValue && isAfter(minValue, comparedDate)) || (maxValue && isAfter(comparedDate, maxValue)))
    },
    isYearOutOfRange (year) {
      const minYear = this.minDate ? getYear(this.minDate) : null
      const maxYear = this.maxDate ? getYear(this.maxDate) : null
      return (minYear && minYear > year) || (maxYear && maxYear < year)
    },
    updateMonth (index) {
      this.setCurrent(new Date(this.current.year, index, 1))
      this.view = 'DAY'
    },
    updateYear (year) {
      this.setCurrent(new Date(year, this.current.month - 1 , 1))
      this.view = 'MONTH'
    }
  }
}
</script>

<style lang="scss" scoped>
.datepicker {
  text-align: center;
  margin: 6px;
  font-size: 14px;
  font-weight: bold;

  .header {
    display: flex;
    align-items: center;
    .btn {
      height: 32px;
      padding: 0 8px;
      font-size: 18px;
      margin: 6px 0;
      text-transform: none;
      &.prev, &.next {
        min-width: 32px;
        width: 32px;
      }
      &.prev {
        .icon {
          transform: scale(-1, 1);
        }
      }
    }
  }
  .grid {
    display: grid;
    align-items: center;
    min-width: 250px;
    min-height: 224px;
    &.days {
      grid-template-columns: repeat(7, 1fr);
      button, .padding {
        height: 32px;
      }
    }
    &.months {
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      button {
        height: 36px;
      }
    }
    &.years {
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 6px;
      button {
        height: 36px;
      }
    }
    button {
      cursor: pointer;
      background-color: transparent;
      outline: none;
      border: none;
      font-weight: bold;
      font-family: inherit;
      font-size: inherit;
      position: relative;
      &.leading {
        color: #aaa;
      }
      &.current {
        border: 1px solid var(--color-primary);
      }
      // &:focus, &:hover:not([disabled]) {
      //   color: var(--color-primary);
      // }
      &:hover:not([disabled]):not(.selected) {
        background-color: #eee;
      }
      &.selected {
        background-color: var(--color-primary);
        color: #fff;
      }
      &[disabled] {
        cursor: not-allowed;
        // text-decoration: line-through;
        &::after {
          content: "";
          position: absolute;
          left: 4px;
          right: 4px;
          top: 50%;
          transform: rotate(35deg);
          border-bottom: 1px solid currentColor;
          opacity: 0.75;
        }
      }
    }
  }
  .days .label {
    font-size: 13.5px;
    font-weight: normal;
    opacity: 0.6;
  }
}
</style>
