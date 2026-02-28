export interface ScoringResult {
  isFiltered: boolean;
  matchedKeyword?: string;
}

export class ScoringEngine {
  public scoreContent(text: string, blockedTags: string[]): ScoringResult {
    const lowerText = text.toLowerCase();
    
    for (const tag of blockedTags) {
      if (tag.trim() && lowerText.includes(tag.toLowerCase())) {
        return {
          isFiltered: true,
          matchedKeyword: tag
        };
      }
    }

    return {
      isFiltered: false
    };
  }
}
