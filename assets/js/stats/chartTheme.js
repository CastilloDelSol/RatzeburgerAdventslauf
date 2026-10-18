const genderRGB = { M: "54, 162, 235", W: "255, 99, 132" };
const raceRGB = ["54, 162, 235", "255, 159, 64", "153, 102, 255", "255, 205, 86", "75, 192, 192"];

export function genderColor(gender, opacity = 1) {
    return `rgba(${genderRGB[gender]}, ${opacity})`;
}

export function raceColor(index, opacity = 0.75) {
    return `rgba(${raceRGB[index % raceRGB.length]}, ${opacity})`;
}

export const finishStatusColors = ["#52C47A", "#EFA93F", "#D9574A", "#9063CD"];
