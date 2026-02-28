import { ScoringEngine, ScoringResult } from './scoringEngine';

export class LocalNLPEngine {
  private engine: ScoringEngine;

  constructor() {
    this.engine = new ScoringEngine();
  }

  public async analyze(text: string, blockedTags: string[]): Promise<ScoringResult> {
    return this.engine.scoreContent(text, blockedTags);
  }
}
