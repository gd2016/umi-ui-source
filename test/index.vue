<template>
  <div class="event-time-comps">
    <div v-if="title" class="title">{{title}}</div>
    <div class="time-selector">
      <MabSelectComps :selectList="adbcList" @onchange="adbcChange"/>
      <div class="time-input-container">
        <input
          type="text"
          class="year"
          placeholder="YYYY"
          v-model="timeObj.year"
          @input="formatYear()"
          ref="time_year"
        >
        <span>/</span>
        <input
          type="text"
          class="month"
          v-model="timeObj.month"
          @input="formatTens('month')"
          placeholder="MM"
          ref="time_month"
        >
        <span>/</span>
        <input
          type="text"
          class="day"
          v-model="timeObj.date"
          @input="formatTens('date')"
          placeholder="DD"
          ref="time_date"
        >
      </div>
    </div>
  </div>
</template>
<script>
import MabSelectComps from "common/vue-component/mab-select/index.vue";
export default {
  components: {
    MabSelectComps
  },
  props: {
    timeInfo: {
      type: Object,
      default() {
        return null;
      }
    },
    title: {
      type: String,
      default: ""
    }
  },
  data() {
    return {
      adbcList: [
        {
          name: "AD",
          text: "AD",
          selected: true
        },
        {
          name: "BC",
          text: "BC",
          selected: false
        }
      ],
      timeObj: {
        year: "",
        month: "",
        date: ""
      }
    };
  },
  created() {
    this.initData();
  },
  methods: {
    isLeapYear(year) {
      if (isNaN(year)) return false
      return ((year % 100 === 0) && (year % 400 !== 0)) || (year % 4 !== 0)
    },
    initData() {
      if (!this.timeInfo) return;
      let name = this.timeInfo.adbcType === 1 ? "AD" : "BC";
      this.adbcChange({ name });
      let { year, month, date = "" } = this.timeInfo;
      console.log(this.timeInfo);
      Object.assign(this.timeObj, { year, month, date });
      console.log(this.timeObj);
    },
    adbcChange(item) {
      console.log(item, this.adbcList);
      this.adbcList.forEach(ele => {
        ele.selected = ele.name === item.name;
      });
    },
    formatYear() {
      let time = this.timeObj;
      let val = "" + time.year;
      console.log(val);
      val = Number(val.replace(/[^\d]/gi, "").slice(0, 5));
      val = val === 0 ? "" : val;

      // 设置年份数据
      time.year = val;
      // if (time.year) {
      //   time.yearWithAdbc = `${time.year * time.adbcType}`
      // }
      this.checkMonthDate(time);
      console.log(time);
    },

    checkMonthDate(time) {
      let { year, month, date } = time;

      if (isNaN(year) || isNaN(month) || isNaN(date)) return;
      year = Number(year);
      month = Number(month);
      date = Number(date);
      if (year > 0 && month > 0 && date > 0) {
        time.month = month < 1 ? 1 : month > 12 ? 12 : month;
        if ([4, 6, 9, 11].indexOf(time.month) !== -1) {
          time.date = date > 30 ? 30 : date;
        } else if (month === 2) {
          let maxDay = this.isLeapYear(year) ? 29 : 28;
          time.date = date > maxDay ? maxDay : date;
        } else {
          time.date = date > 31 ? 31 : date;
        }
      }
    },
    formatTens(type) {
      let val = "" + this.timeObj[type];
      val = Number(val.replace(/[^\d]/gi, "").slice(0, 2));
      let dateMax = 31;
      let maxType = {
        month: 12,
        date: 31,
        hour: 23,
        min: 59,
        sec: 59
      };
      val = val > maxType[type] ? maxType[type] : val;
      val = val || "";
      this.timeObj[type] = val;
      let focusKey = this.checkBeforeEmpty(this.timeObj, type);

      if (focusKey) {
        // 获取焦点
        let refName = `time_${focusKey}`;
        this.$refs[refName] && this.$refs[refName].focus();
      }
      this.checkMonthDate(this.timeObj);
    },

    //检查日期是否合法，前置单位是否为空
    checkBeforeEmpty(time, type) {
      let keys = ["year", "month", "date", "hour", "min", "sec"];
      let idx = keys.indexOf(type);
      let isEmptyVal = false;
      let focusKey;
      let emptyIndex = keys.findIndex(key => {
        return !time[key];
      });
      if (emptyIndex !== -1 && idx > emptyIndex) {
        focusKey = keys[emptyIndex];
        time[type] = "";
      }
      return focusKey;
    },
    getTime() {
      let { year, month, date } = this.timeObj;
      let select = this.adbcList.find(ele => {
        return ele.selected;
      });
      let adbcType = select ? (select.name === "AD" ? 1 : -1) : 1;

      return {
        adbcType,
        year: "" + year,
        month: "" + month,
        date: "" + date
      };
    }
  }
};
</script>
<style lang="less" scoped>
.event-time-comps {
  .time-selector {
    display: flex;
    .mab-select-component {
      margin-right: 10px;
    }
    .time-input-container {
      display: inline-block;
      font-size: 0;
      width: 134px;
      height: 24px;
      border-radius: 2px;
      border: 1px solid #d8d8d8;
      span {
        display: inline-block;
        font-size: 12px;
        line-height: 22px;
      }
      input {
        width: 24px;
        text-align: right;
        font-size: 12px;
        display: inline-block;
        height: 20px;
        line-height: 20px;
      }
      .year {
        width: 40px;
        margin: 1px 4px 1px 16px;
      }
      .month {
        margin: 1px 4px;
      }
      .day {
        width: 24px;
        margin: 1px 0 1px 4px;
      }
    }
  }
}
</style>
