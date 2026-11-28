// The AI lecturers a student can choose from. Each entry is everything the stage needs to draw and voice one, so adding a
// 3D (VRM) model later means filling in `vrmUrl` here and dropping the file in public/tutors, with no change to the layout.
export const LECTURERS = {
  FEMALE: { id: "FEMALE", name: "Dr. Ada Okafor", role: "AI lecturer", voice: "female", vrmUrl: null },
  MALE: { id: "MALE", name: "Dr. Tunde Bello", role: "AI lecturer", voice: "male", vrmUrl: null },
};

export const LECTURER_IDS = Object.keys(LECTURERS);

/** The lecturer to show: the student's own choice in this browser, else the lesson's tutor voice, else the female lecturer. */
export function pickLecturer(choice, sessionVoice) {
  if (LECTURER_IDS.includes(choice)) return choice;
  if (LECTURER_IDS.includes(sessionVoice)) return sessionVoice;
  return "FEMALE";
}
