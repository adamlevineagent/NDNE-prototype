// backend/src/tests/commentTone.spec.ts

// Regex for common emojis (Unicode ranges) - This is not exhaustive!
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

// Regex for common informal slang/contractions (examples)
const slangRegex = /\b(gonna|wanna|gotta|ain't|lol|imo|imho|btw|fyi)\b/i;

// Regex for apologies
const apologyRegex = /\b(sorry|apologies|apologize|oops|my bad)\b/i;

// Regex for first-person singular "I" (allow "my")
const firstPersonIRegex = /\bI\b(?!\'m|\'ve|\'ll|\'d)/i; // Matches "I" but not "I'm", "I've" etc.

// Regex for the required rationale prefix
// Allows for variations in the priority description (X)
const rationalePrefixRegex = /^Based on my sovereign’s priority [\w\s-]+[,.:]?\s+/i;

describe('Agent Comment Tone Lint', () => {

    // --- Test Cases ---
    const validComments = [
        "Based on my sovereign’s priority for fiscal responsibility, I recommend voting NO.", // Example allows "I recommend" after prefix
        "Based on my sovereign’s priority to expedite decisions, this seems acceptable.",
        "Based on my sovereign’s priority regarding security implications: the proposal lacks sufficient detail.",
    ];

    const invalidComments = [
        // Missing Rationale
        "I recommend voting NO.",
        "This seems acceptable.",
        // Contains Emoji
        "Based on my sovereign’s priority for fun, this looks good 👍.",
        // Contains Slang
        "Based on my sovereign’s priority, I'm gonna vote YES.",
        "Based on my sovereign’s priority, btw, we should check the budget.",
        // Contains Apology
        "Based on my sovereign’s priority, sorry, I must vote NO.",
        "Based on my sovereign’s priority, oops, missed that detail.",
        // Contains first-person "I" (without being part of rationale explanation like "I recommend") - This rule is tricky based on example.
        // Let's test for "I think", "I feel" as clear violations.
        "Based on my sovereign’s priority, I think this is wrong.",
        "Based on my sovereign’s priority, I feel we should wait.",
        // Rationale prefix present but followed by invalid content
        "Based on my sovereign’s priority X, lol this is funny.",
        "Based on my sovereign’s priority Y, I'm sorry but no.",
    ];

    // --- Tests for Valid Comments ---
    validComments.forEach((comment, index) => {
        it(`should PASS valid comment ${index + 1}`, () => {
            expect(comment).toMatch(rationalePrefixRegex);
            expect(comment).not.toMatch(emojiRegex);
            expect(comment).not.toMatch(slangRegex);
            expect(comment).not.toMatch(apologyRegex);
            // Refined check: Allow "I" if it follows the rationale prefix and is part of a recommendation/statement
            // This is complex, let's focus on *disallowing* "I think", "I feel" for now.
             expect(comment).not.toMatch(/\bI (think|feel)\b/i);
        });
    });

    // --- Tests for Invalid Comments ---
    invalidComments.forEach((comment, index) => {
        it(`should FAIL invalid comment ${index + 1}`, () => {
            const hasRationale = rationalePrefixRegex.test(comment);
            const hasEmoji = emojiRegex.test(comment);
            const hasSlang = slangRegex.test(comment);
            const hasApology = apologyRegex.test(comment);
            const hasForbiddenI = /\bI (think|feel)\b/i.test(comment); // Check for "I think/feel"

            // An invalid comment must either:
            // 1. Lack the rationale prefix OR
            // 2. Contain emoji, slang, apology, or forbidden "I" phrasing.
            expect(!hasRationale || hasEmoji || hasSlang || hasApology || hasForbiddenI).toBe(true);
        });
    });

     // Specific tests for each rule violation
     it('should fail if rationale prefix is missing', () => {
        const comment = "This proposal looks good.";
        expect(comment).not.toMatch(rationalePrefixRegex);
     });

     it('should fail if it contains emojis', () => {
        const comment = "Based on my sovereign’s priority X, this is great 😊.";
        expect(comment).toMatch(emojiRegex);
     });

     it('should fail if it contains slang', () => {
        const comment = "Based on my sovereign’s priority X, we gotta approve this.";
        expect(comment).toMatch(slangRegex);
     });

     it('should fail if it contains apologies', () => {
        const comment = "Based on my sovereign’s priority X, sorry, but I disagree.";
        expect(comment).toMatch(apologyRegex);
     });

     it('should fail if it contains forbidden first-person phrasing like "I think"', () => {
        const comment = "Based on my sovereign’s priority X, I think it's risky.";
        expect(comment).toMatch(/\bI think\b/i);
     });

     // Test edge case from example: "I recommend" should be allowed *after* prefix
     it('should allow "I recommend" after the rationale prefix', () => {
        const comment = "Based on my sovereign’s priority for fiscal responsibility, I recommend voting NO.";
        expect(comment).toMatch(rationalePrefixRegex); // Has prefix
        expect(comment).not.toMatch(emojiRegex);
        expect(comment).not.toMatch(slangRegex);
        expect(comment).not.toMatch(apologyRegex);
        expect(comment).not.toMatch(/\bI (think|feel)\b/i); // Doesn't have "I think/feel"
        // We don't explicitly fail it for having "I recommend"
     });

});