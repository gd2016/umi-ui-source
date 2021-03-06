import { IApi, utils } from 'umi';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { IFlowContext } from './types';
import { FlowState, StepState } from './enum';
import Logger from './Logger';
import execa from '../util/exec';

import gitTasks from './tasks/gitTasks';
import filesTasks from './tasks/filesTasks';

const { createDebug } = utils;

const debug = createDebug('umi:umiui:plugin-ui-blocks:addBlock');

class Flow extends EventEmitter {
  public api: IApi;

  public ctx: IFlowContext;

  public tasks: any[] = [];

  public isCancel: boolean = false; // 用户取消

  public logger: Logger;

  public proc: ChildProcess;

  public state: FlowState = FlowState.INIT;

  constructor({ api, args }: { api: IApi }) {
    super();
    this.api = api;
    this.logger = new Logger();
    this.logger.on('log', data => {
      this.emit('log', data);
    });

    this.ctx = {
      execa: execa(this.logger, this.setProcRef.bind(this)),
      api: this.api,
      logger: this.logger,
      stages: {},
      result: {},
    };
    // git 方式
    this.registryTasks(args);
  }

  public async run(args) {
    this.state = FlowState.ING;
    let hasBreak = false;

    // eslint-disable-next-line no-restricted-syntax
    for (const { name, task, state } of this.tasks) {
      console.log('Flow current task', name);
      // 用户取消任务
      if (this.isCancel) {
        hasBreak = true;
        this.setStepState(name, StepState.CANCEL);
        break;
      }

      if (state === StepState.SUCCESS) {
        // eslint-disable-next-line no-continue
        continue;
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        await task(this.ctx, args);
        this.setStepState(name, StepState.SUCCESS);
      } catch (e) {
        console.error('Execute task error', e);
        hasBreak = true;
        /**
         * 抛错有两种情况
         *  1. 任务执行出错
         *  2. 用户取消后，会杀死子进程，子进程可能 edit(1)
         */
        if (!this.isCancel) {
          this.state = FlowState.FAIL;
          this.setStepState(name, StepState.FAIL);
          this.emit('state', {
            ...args,
            state: FlowState.FAIL,
          });
          this.emit('log', {
            data: `\n🚧  Execute task error: ${e.message}\n`,
          });
          console.error('[Asset Error]', e);
        }
        break;
      }
    }

    if (hasBreak) {
      return this.ctx.result;
    }

    // 完成之后触发一下完成事件，前端更新一下按钮状态
    this.state = FlowState.SUCCESS;
    const { generator } = this.ctx.stages;
    this.emit('state', {
      data: {
        ...args,
        previewUrl: `http://localhost:${process.env.PORT || '8000'}${generator.path.toLowerCase()}`,
      },
      state: FlowState.SUCCESS,
    });

    // 清空日志
    this.logger.clear();
    return this.ctx.result;
  }

  public cancel() {
    if (this.state !== FlowState.ING) {
      const err = new Error(`Error state(${this.state}) to terminated`);
      err.name = 'FlowError';
      throw err;
    }
    this.isCancel = true;
    this.state = FlowState.CANCEL;
    if (this.proc) {
      this.proc.kill('SIGTERM');
    }
    setTimeout(() => {
      this.emit('log', {
        data: '\n🛑  Stopped task success!\n',
      });
    }, 2000);
  }

  /**
   * 重试
   */
  public async retry(args) {
    if (this.state !== FlowState.FAIL) {
      const err = new Error(`Error state(${this.state}) to retry`);
      err.name = 'FlowError';
      throw err;
    }
    return this.run(args);
  }

  public getLog() {
    return this.logger.getLog();
  }

  public getBlockUrl() {
    if (this.state !== FlowState.ING) {
      return '';
    }
    return this.ctx.result.blockUrl;
  }

  private setStepState(taskName: string, state: StepState) {
    const curTask = this.tasks.find(({ name }) => name === taskName);
    if (!curTask) {
      return;
    }
    curTask.state = state;
  }

  private registryTasks(args) {
    (args.files ? filesTasks : gitTasks).forEach(({ name, task }) => {
      this.tasks.push({
        name,
        task,
        state: StepState.INIT,
      });
    });
  }

  private setProcRef(proc) {
    this.proc = proc;
  }
}

export default Flow;
