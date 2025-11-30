const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    minute: { type: Number },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    date: { type: Date, required: true },
    venue: { type: String, required: true },
    status: {
      type: String,
      enum: ['upcoming', 'live', 'completed'],
      default: 'upcoming',
    },
    scoreA: { type: Number, default: 0 },
    scoreB: { type: Number, default: 0 },
    goals: [goalSchema],
    teamALineup: {
      goalkeeper: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    },
    teamBLineup: {
      goalkeeper: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    },
    substitutions: [{
      team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      playerOut: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      playerIn: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      minute: { type: Number },
    }],
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Match', matchSchema);


