// MongoDB script to set up Chanakya Sutra channel profile
// Run with: mongosh "<your-mongodb-url>" < setup_chanakya_mongodb.js

use forgevoice_prod;

// Set up Chanakya Sutra channel profile
db.channel_profiles_collection.updateOne(
  { clientId: "chanakya-sutra" },
  {
    $set: {
      languageStyle: "hinglish",
      thumbnailStyle: "black_minimal",
      brandDescription: "Channel delivering ancient Chanakya Niti wisdom for modern business leaders, entrepreneurs, and strategists. Content blends Indian philosophy with practical business strategy, told through cinematic storytelling in Hinglish.",
      tone: "Authoritative storyteller, dramatic and wise, strategic thinker, speaks with gravitas and conviction",
      contentPillars: [
        "Chanakya Niti Principles",
        "Leadership & Strategy",
        "Business Warfare Tactics",
        "Ancient Indian Philosophy",
        "Entrepreneurship Wisdom",
        "Power Dynamics",
        "Negotiation Mastery",
        "Decision-Making Frameworks"
      ],
      thumbnailsPerShort: 1,
      voiceId: "",
      updatedAt: new Date().toISOString()
    },
    $setOnInsert: {
      id: UUID().toString(),
      clientId: "chanakya-sutra",
      scriptsPerIdea: 1,
      thumbnailPromptTemplate: "Pure black background, bold white text, single gold accent line, no faces, extremely high contrast, dramatic lighting",
      visualPromptTemplate: "Chanakya — bald head, sharp defined jawline, long white beard, saffron-orange robe, intense piercing eyes, calm but commanding expression, ancient Indian strategist aesthetic, age ~55, lean build, photorealistic, cinematic lighting",
      createdAt: new Date().toISOString()
    }
  },
  { upsert: true }
);

print("✅ Chanakya Sutra channel profile configured!");
print("");
print("Profile settings:");
print("  • Language: Hinglish (Hindi in Roman script with performance cues)");
print("  • Thumbnails: Black Minimal (pure black background, white text, gold accents)");
print("  • Voice: Authoritative storyteller, dramatic, wise");
print("  • Content Pillars: 8 themes focused on Chanakya wisdom");
print("");

// Verify the profile was created
const profile = db.channel_profiles_collection.findOne({ clientId: "chanakya-sutra" });
if (profile) {
  print("Verification:");
  print("  Profile ID: " + profile.id);
  print("  Client ID: " + profile.clientId);
  print("  Language Style: " + profile.languageStyle);
  print("  Thumbnail Style: " + profile.thumbnailStyle);
  print("  Content Pillars: " + profile.contentPillars.length + " configured");
  print("");
  print("✅ All future AI-generated content will use this archetype!");
} else {
  print("❌ ERROR: Profile not found after insert!");
}
