<template>
  <div class="simple-file" :class="{empty}">
    <div v-if="newFileInfo" key="new" class="new-file">
      <div class="symbol f-row">
        <v-icon name="file-outline" size="40" color="#646464"/>
      </div>
      <span class="filename f-row-ac">
        <span class="name" v-text="newFileInfo.name"/>
        <span class="ext" v-text="newFileInfo.ext"/>
      </span>
      <span class="filesize">
        <translate>Size</translate>: {{ newFileInfo.size }}
      </span>

      <v-btn class="icon small flat m-0" @click="$emit('reset')">
        <v-icon name="x"/>
      </v-btn>
    </div>
    <div v-else-if="value" key="actual" class="file-info f-row-ac">
      <div class="symbol f-row">
        <v-icon name="file-outline" color="primary"/>
      </div>
      <a :href="valueUrl" target="_blank" class="filename f-row-ac f-grow">
        <span class="name" v-text="link.name"/>
        <span class="ext" v-text="link.ext"/>
      </a>
      <div class="tools f-row-ac">
        <v-btn class="icon small mx-2" @click="download">
          <v-icon name="download"/>
        </v-btn>
        <v-btn class="icon small" :disabled="disabled" @click="$emit('delete')">
          <v-icon name="delete_forever"/>
        </v-btn>
      </div>
    </div>
    <div v-else class="f-row-ac f-grow">
      <v-icon name="no-file" color="#646464"/>
    </div>
    <div class="input-container">
      <slot name="input"/>
    </div>
  </div>
</template>

<script lang="js">
import Path from 'path'
import FileSaver from 'file-saver'
import formatFileSize from '@/format/filesize'

export default {
  props: {
    disabled: Boolean,
    value: [String, Function],
    valueUrl: String,
    inputFile: [File, Blob],
    options: Object
  },
  computed: {
    link () {
      if (this.value) {
        // value can be a function, so it's needed to use toString()
        const { name, ext } = Path.parse(this.value.toString())
        return { name, ext }
      }
      return {}
    },
    newFileInfo () {
      if (this.inputFile) {
        const { name, size } = this.inputFile
        const pname = Path.parse(name)
        return {
          name: pname.name,
          ext: pname.ext,
          size: formatFileSize(size)
        }
      }
      return null
    },
    empty () {
      return !this.value && !this.inputFile
    },
    maxSizeLimit () {
      return this.options?.max_size ? this.options.max_size * 1048576 : null
    }
  },
  watch: {
    inputFile: {
      immediate: true,
      handler (f) {
        if (f && this.maxSizeLimit && f.size > this.maxSizeLimit) {
          this.$emit('error', this.$gettext('File exceeds maximum allowed size')+` (${formatFileSize(this.maxSizeLimit)})`)
        }
      }
    }
  },
  methods: {
    download () {
      FileSaver.saveAs(this.valueUrl, Path.basename(this.value))
    }
  }
}
</script>

<style lang="scss" scoped>
.simple-file {
  display: flex;
  flex-direction: column;
  margin-top: 4px;
  overflow: hidden;
  gap: 6px;
  &.empty {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }

  .new-file {
    display: grid;
    grid-template-rows: auto auto;
    grid-template-columns: auto 1fr auto;
    overflow: hidden;
    column-gap: 4px;

    // background-color: #ddd;
    background-image: linear-gradient(to right, rgba(#ddd, 0.25), #d5d5d5);
    border-radius: 3px;
    padding: 2px 2px 2px 0;
    border: 1px solid #ddd;

    .symbol {
      grid-area: 1 / 1 / 3 / 2;
    }
    .filesize {
      grid-area: 2 / 2 / 3 / 3;
      font-weight: 500;
      font-size: 13px;
      opacity: 0.8;
      line-height: 1;
    }
    .btn {
      grid-area: 1 / 3 / 3 / 4;
    }
  }
  .input-container {
    align-self: flex-end;
    .btn {
      margin: 0;
    }
  }
  .file-info {
    display: flex;
    gap: 4px;
    padding: 3px 4px;
    background-image: linear-gradient(to right, rgba(#ddd, 0.5), #d7d7d7);
    border: 1px solid #ddd;
    border-radius: 3px;
    overflow: hidden;
    max-width: 100%;
    a {
      color: var(--color-primary);
      text-decoration: none;
    }
  }
  .tools {
    --gutter: 0;
  }
}
.filename {
  grid-area: 1 / 2 / 2 / 3;
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
  min-width: 0;
  .name {
    min-width: 0;
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ext {
    flex-shrink: 0;
  }
}
</style>
