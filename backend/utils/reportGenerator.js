/** @format */

function generatePatientReport(formData, gender) {
	const report = [];
	const labRecommendations = [];

	// --- Diabetes ---
	if (["Yes", "Unsure"].includes(formData.diabetes)) {
		report.push({
			title: "Diabetes Risk",
			body:
				"You may be at risk for diabetes. Consider testing HbA1c, fasting glucose, and insulin. Lifestyle changes may improve glucose control."
		});
		labRecommendations.push("Metabolic Panel");
	}

	// --- Cholesterol ---
	if (["Yes", "Unsure"].includes(formData.cholesterol)) {
		report.push({
			title: "Cholesterol & Statins",
			body:
				"You may benefit from a lipid panel and ApoB test. Managing cholesterol is key to brain and cardiovascular health."
		});
		labRecommendations.push("Lipid Panel");
	}

	// --- Statins ---
	if (formData.statins === "Yes") {
		report.push({
			title: "Statin Use",
			body:
				"You are currently taking a statin. Monitor your lipid levels and discuss any side effects with your healthcare provider."
		});
	}

	// --- High Blood Pressure ---
	if (["Yes", "Unsure"].includes(formData.hbp)) {
		report.push({
			title: "High Blood Pressure",
			body:
				"You may be experiencing hypertension. This can affect cardiovascular and brain health. Lifestyle interventions are recommended."
		});
	}

	// --- Autoimmune ---
	if (["Yes", "Unsure"].includes(formData.autoimmune)) {
		report.push({
			title: "Autoimmune Risk",
			body:
				"Autoimmune conditions may increase inflammation and affect brain health. Anti-inflammatory strategies may be helpful."
		});
	}

	// --- Thyroid ---
	if (["Yes", "Unsure"].includes(formData.thyroid)) {
		report.push({
			title: "Thyroid Function",
			body:
				"Thyroid imbalance can impact energy, mood, and cognition. A thyroid panel may be helpful."
		});
		labRecommendations.push("Thyroid Panel");
	}

	// --- Chronic Stress ---
	if (formData.stress === "Yes") {
		report.push({
			title: "Chronic Stress",
			body:
				"Chronic stress is associated with inflammation and cognitive decline. Mindfulness, exercise, and sleep may help."
		});
	}

	// --- Vegan Diet ---
	if (formData.vegan === "Yes") {
		report.push({
			title: "Vegan Diet",
			body:
				"Vegan diets may lack B12, D, and omega-3s. Consider testing and supplementation to support brain health."
		});
	}

	// --- Migraines ---
	if (formData.migraines === "Yes") {
		report.push({
			title: "Migraines",
			body:
				"Migraines may be linked to inflammation and neurological function. Monitoring and reducing triggers is advised."
		});
	}

	// --- Asthma/Allergies ---
	if (formData.asthma === "Yes") {
		report.push({
			title: "Allergic Asthma",
			body:
				"Severe allergies may contribute to chronic inflammation. Environmental controls and immune support may help."
		});
	}

	// --- Viral Infections ---
	if (formData.viral === "Yes") {
		report.push({
			title: "Chronic Viral Infections",
			body:
				"Chronic viral infections may place stress on the immune system. Discuss antiviral strategies with your doctor."
		});
	}

	// --- Gum Disease ---
	if (formData.gum === "Yes") {
		report.push({
			title: "Gum Disease",
			body:
				"Gum disease is linked to inflammation and cognitive health. Oral hygiene and treatment are key."
		});
	}

	// --- Sleep Disturbance ---
	if (["Yes", "Unsure"].includes(formData.sleep)) {
		report.push({
			title: "Sleep & Anxiety",
			body:
				"Poor sleep and anxiety may affect brain recovery and cognition. Consider sleep hygiene practices and stress reduction."
		});
	}

	// --- Depression ---
	if (["Yes", "Unsure"].includes(formData.depression)) {
		report.push({
			title: "Depression",
			body:
				"Depression can impact brain health. Support systems, therapy, and nutrition may be helpful."
		});
	}

	// --- Anemia ---
	if (["Yes", "Unsure"].includes(formData.anemia)) {
		report.push({
			title: "Anemia",
			body:
				"Low iron or anemia may reduce oxygen delivery to the brain. A CBC test is recommended."
		});
		labRecommendations.push("Iron Balance");
	}

	// --- Hemochromatosis ---
	if (["Yes", "Unsure"].includes(formData.hemochromatosis)) {
		report.push({
			title: "Hemochromatosis",
			body:
				"Hemochromatosis can lead to iron overload. Iron level monitoring is recommended."
		});
		labRecommendations.push("Iron Balance");
	}

	// --- Hearing Loss ---
	if (formData.hearing === "Yes") {
		report.push({
			title: "Hearing Loss",
			body:
				"Hearing difficulties may affect communication and cognition. Consider hearing screening and assistive devices."
		});
	}

	// --- Cataracts ---
	if (["Yes", "Unsure"].includes(formData.cataracts)) {
		report.push({
			title: "Cataracts",
			body:
				"Cataracts can impact vision and independence. Discuss with an eye care specialist if vision changes are noticed."
		});
	}

	// --- Mold ---
	if (["Yes", "Unsure"].includes(formData.mold)) {
		report.push({
			title: "Mold Exposure",
			body:
				"Mold exposure may impact respiratory and cognitive function. Air quality remediation may be helpful."
		});
	}

	// --- Heavy Metals ---
	if (["Yes", "Unsure"].includes(formData.heavyMetals)) {
		report.push({
			title: "Heavy Metal Exposure",
			body:
				"Heavy metals can affect the brain and organs. Detox strategies or testing may be recommended."
		});
		labRecommendations.push("Heavy Metals");
	}

	// --- Alcohol ---
	if (formData.alcohol === "Yes") {
		report.push({
			title: "Alcohol Use",
			body:
				"Alcohol can affect memory, sleep, and brain function. Moderation or abstinence may support cognitive health."
		});
	}

	// --- Cognition Test ---
	if (["Yes", "Unsure"].includes(formData.cognitionWilling)) {
		report.push({
			title: "Cognition Test",
			body:
				"Consider completing the 10-minute cognition test to benchmark your brain function."
		});
	}

	if (formData.cognitionScore && formData.cognitionScore.length > 0) {
		report.push({
			title: "Cognition Score Logged",
			body: `Your reported cognition score: ${formData.cognitionScore}. Monitor future scores for trends.`
		});
	}

	// --- HRT & ED ---
	if (gender === "female" && formData.hrtFemale === "Yes") {
		report.push({
			title: "Hormone Replacement Therapy (Female)",
			body: "HRT may help with mood, sleep, and memory. Speak to your provider about personalized options."
		});
	}

	if (gender === "male") {
		if (formData.hrtMale === "Yes") {
			report.push({
				title: "Hormone Replacement Therapy (Male)",
				body: "HRT for men may impact energy, libido, and cognition. Consider testosterone testing if symptoms are present."
			});
		}

		if (formData.ed === "Yes") {
			report.push({
				title: "Erectile Dysfunction",
				body: "ED can reflect vascular or neurological health. Discuss testing and treatment options with your provider."
			});
		}
	}

	return { report, labRecommendations };
}

module.exports = { generatePatientReport };