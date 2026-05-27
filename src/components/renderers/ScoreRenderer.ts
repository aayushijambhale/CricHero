import * as PIXI from 'pixi.js';

export class ScoreRenderer {
  private container: PIXI.Container;
  private scoreText: PIXI.Text;

  constructor() {
    this.container = new PIXI.Container();
    
    // Modern broadcast typography
    this.scoreText = new PIXI.Text({
      text: "0/0", 
      style: {
        fontFamily: 'Inter',
        fontSize: 120,
        fontWeight: '900',
        fill: 0xffffff,
        dropShadow: {
          alpha: 0.5,
          angle: Math.PI / 6,
          blur: 4,
          color: 0x000000,
          distance: 6
        }
      }
    });

    this.container.addChild(this.scoreText);
  }

  updateScore(runs: number, wickets: number) {
    this.scoreText.text = `${runs}/${wickets}`;
  }

  getContainer(): PIXI.Container {
    return this.container;
  }
}
