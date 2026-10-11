/**
 * Scene manager
 */

export type SceneName = 'Laser' | 'Bomb' | 'Shield' | 'Door' | 'Hack' | 'Cube' | 'Falling Card' | 'Meteor';

export class SceneManager {
  private scenes: SceneName[] = ['Laser', 'Bomb', 'Shield', 'Door', 'Hack', 'Cube', 'Falling Card', 'Meteor'];
  private currentIndex = 0;
  private currentScene: SceneName = this.scenes[0];

  getSceneForStep(step: number): SceneName {
    const index = Math.min(step, this.scenes.length - 1);
    return this.scenes[index];
  }

  setStep(step: number): SceneName {
    const scene = this.getSceneForStep(step);
    this.currentIndex = this.scenes.indexOf(scene);
    this.currentScene = scene;
    return scene;
  }

  getCurrentScene(): SceneName {
    return this.currentScene;
  }

  getSceneList(): SceneName[] {
    return this.scenes;
  }
}
