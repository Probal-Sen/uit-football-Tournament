const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    jerseyNumber: { type: Number },
    position: { type: String, required: true },
    department: {
      type: String,
      enum: ['CSE', 'IT', 'ECE', 'EE', 'CE', 'AEIE'],
      required: true,
    },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    photoUrl: { type: String },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Player', playerSchema);


