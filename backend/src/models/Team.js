const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    department: {
      type: String,
      enum: ['CSE', 'IT', 'ECE', 'EE', 'CE', 'AEIE'],
      required: true,
    },
    logoUrl: { type: String },
    coachName: { type: String },
    captainName: { type: String },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);


