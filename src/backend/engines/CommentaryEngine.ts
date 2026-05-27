export class CommentaryEngine {
  /**
   * Generates dynamic, context-aware commentary strings based on the delivery outcome.
   */
  generateCommentary(deliveryData: any): string {
    const { bowlerName, batsmanName, runs, isWicket, isBoundary, deliveryType } = deliveryData;

    if (isWicket) {
      return `OUT! ${bowlerName} strikes! ${batsmanName} has to walk back. What a crucial breakthrough!`;
    }

    if (isBoundary) {
      if (runs === 6) {
        return `SIX! High and handsome from ${batsmanName}! Dispatched into the crowd by ${bowlerName}.`;
      }
      return `FOUR! Classic timing from ${batsmanName}. Pierces the gap beautifully.`;
    }

    if (runs === 0) {
      return `Dot ball. Good tight line from ${bowlerName}.`;
    }

    return `${runs} run${runs > 1 ? 's' : ''}. Easy rotation of strike by ${batsmanName}.`;
  }
}

export const commentaryEngine = new CommentaryEngine();
