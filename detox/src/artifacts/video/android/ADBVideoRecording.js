const fs = require('fs-extra');
const RecordingArtifact = require('../../core/artifact/RecordingArtifact');
const ensureExtension = require('../../../utils/ensureExtension');
const interruptProcess = require('../../../utils/interruptProcess');
const sleep = require('../../../utils/sleep');

class ADBVideoRecording extends RecordingArtifact {
  constructor(config) {
    super();

    this.adb = config.adb;
    this.deviceId = config.deviceId;
    this.pathToVideoOnDevice = config.pathToVideoOnDevice;
    this.screenRecordOptions = { ...config.screenRecordOptions };

    this.processPromise = null;
    this.waitWhileVideoIsMostLikelyBusy = null;
  }

  async doStart() {
    this.processPromise = this.adb.screenrecord(this.deviceId, {
      ...this.screenRecordOptions,
      path: this.pathToVideoOnDevice
    });

    await this._delayWhileVideoFileIsEmpty();
  }

  async doStop() {
    if (this.processPromise) {
      await interruptProcess(this.processPromise);
      this.waitWhileVideoIsMostLikelyBusy = sleep(500);
    }
  }

  async doSave(artifactPath) {
    const mp4ArtifactPath = ensureExtension(artifactPath, '.mp4');

    await this._delayWhileVideoFileIsBusy();
    await fs.ensureFile(mp4ArtifactPath);
    await this.adb.pull(this.deviceId, this.pathToVideoOnDevice, mp4ArtifactPath);
    await this.adb.rm(this.deviceId, this.pathToVideoOnDevice);
  }

  async doDiscard() {
    await this._delayWhileVideoFileIsBusy();
    await this.adb.rm(this.deviceId, this.pathToVideoOnDevice);
  }

  async _delayWhileVideoFileIsEmpty() {
    await sleep(300); // wait while video is most likely empty
    await this.adb.waitForFileRecording(this.deviceId, this.pathToVideoOnDevice);
  }

  async _delayWhileVideoFileIsBusy() {
    await this.waitWhileVideoIsMostLikelyBusy;
    await this.adb.waitForFileRelease(this.deviceId, this.pathToVideoOnDevice);
  }
}

module.exports = ADBVideoRecording;