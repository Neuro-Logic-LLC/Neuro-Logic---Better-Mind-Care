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

	// --- Cognition Test Results ---
	const score = parseFloat(formData.cognitionTestScore);
	const pastScore = parseFloat(formData.cognitionPastScore);

	// Willing to take test
	if (formData.cognitionTestType === 'XpressO' && !isNaN(score)) {
		if (score >= 72) {
			report.push({
				title: "Xpresso Cognitive Test",
				body: `Your XpressO Score: ${score}\nTest Date: ${formData.cognitionTestDate}\n\nHow to interpret XpressO scores:\n• 72 or above: Strong likelihood (91.3%) of normal cognition\n• 42 or below: High probability (90%) of cognitive impairment\n• 43–71: Intermediate range — further evaluation is typically recommended\n\nWhat this means:\nYour score falls within the high-confidence range for normal cognition.\nBased on validation studies, individuals scoring 72 or higher have a 91.3% likelihood of normal cognitive function.\nThis is a strong result — and something to feel good about.\nBut great brain health today doesn’t guarantee the same tomorrow. Many of the risk factors for cognitive decline are silent and build over time. That’s why this is the perfect moment to get proactive.\nEven if you aren’t experiencing symptoms now, your Brain Health Blueprint is designed to help you stay that way.\nIt includes:\nA personalized analysis of hidden risks — like inflammation, blood sugar, toxins, or genetic vulnerabilities\nPractical strategies to strengthen brain resilience over the long term\nScience-backed recommendations for nutrition, movement, stress, and supplements\nA cognitive wellness roadmap you can return to, year after year\n\nUse your strong score as a springboard — not a finish line.\n\nOur Blueprint gives you the tools to keep your brain sharp, focused, and healthy for the long haul.\n\nNow is the time to invest in the habits and insights that protect what matters most.\n\nThis scale is used as a general guide and does not replace clinical evaluation. XpressO scores may be influenced by age, education, or testing conditions.`
			});
		} else if (score >= 43 && score <= 71) {
			report.push({
				title: "Xpresso Cognitive Test",
				body: `Your XpressO Score: ${score}\nTest Date: ${formData.cognitionTestDate}\n\nHow to interpret XpressO scores:\n• 72 or above: Strong likelihood (91.3%) of normal cognition\n• 42 or below: High probability (90%) of cognitive impairment\n• 43–71: Intermediate range — further evaluation is typically recommended\n\nWhat this means:\nYour XpressO score suggests that further evaluation is appropriate — and that’s where your Brain Health Blueprint comes in.\nWhether you’re experiencing Mild Cognitive Impairment or are simply concerned about memory changes, our Blueprint gives you:\nA personalized breakdown of your risk factors\nPractical, research-backed strategies to protect and improve brain health\nA roadmap to move forward with clarity — not confusion\nStart implementing your plan now, while change is still possible.\n\nThis scale is used as a general guide and does not replace clinical evaluation. XpressO scores may be influenced by age, education, or testing conditions.`
			});
		} else if (score <= 42) {
			report.push({
				title: "Xpresso Cognitive Test",
				body: `Your XpressO Score: ${score}\nTest Date: ${formData.cognitionTestDate}\n\nHow to interpret XpressO scores:\n• 72 or above: Strong likelihood (91.3%) of normal cognition\n• 42 or below: High probability (90%) of cognitive impairment\n• 43–71: Intermediate range — further evaluation is typically recommended\n\nWhat this means:\nWhile this does not serve as a diagnosis, there’s a strong likelihood that cognitive impairment is present — but this does not mean it’s too late to act.\nThat’s exactly why we created the BetterMindCare Brain Health Blueprint — to help people like you take control of the factors that can still influence brain function, memory, mood, and quality of life.\nOur program is designed for individuals already experiencing symptoms, and includes:\nPersonalized lab-driven insights\nTargeted lifestyle strategies for brain support\nSupplement and nutrition guidance\nTools for caregivers and loved ones\nWe encourage you to begin your Brain Blueprint Action Plan today. Small steps, consistently applied, can still make a powerful difference.\n\nThis scale is used as a general guide and does not replace clinical evaluation. XpressO scores may be influenced by age, education, or testing conditions.`
			});
		}
	} else if (formData.cognitionTestType === 'MoCA' && !isNaN(score)) {
		if (score >= 26) {
			report.push({
				title: "MoCA Cognitive Test",
				body: `Your MoCA Score: ${score}\nTest Date: ${formData.cognitionTestDate}\n\nWhat this means:\nYour score is within the normal range for cognitive function.\nWhile this is a positive result, it's important to remember that brain health can change over time.\nYour Brain Health Blueprint offers proactive strategies to help preserve memory, protect mental clarity, and address hidden risk factors before symptoms ever begin.\n\nMoCA Score Interpretation:\nNormal Cognitive performance is 26 and above\nMild cognitive impairment is 18-25, a noticeable decline in memory or thinking skills that is greater than normal aging but not severe enough to significantly affect daily life.\nModerate cognitive impairment is 10-17, when memory and thinking problems go beyond mild forgetfulness and begin to noticeably disrupt daily tasks, requiring extra reminders or occasional help to stay independent.\nSevere cognitive impairment is 0-9, when memory and thinking problems are so pronounced that a person can no longer manage daily life on their own and needs regular, hands-on assistance for basic activities.\n\nNext Steps:\nYour MoCA score is one part of a bigger picture. That’s why we created your Brain Health Blueprint — a personalized wellness plan that addresses the root drivers of cognitive change, including inflammation, blood sugar, stress, nutrition, toxins, and more.\nWhether you're in a preventive, early-intervention, or support phase, your Blueprint can guide small, meaningful actions that support brain function and protect quality of life.\n\nMoCA scores may be influenced by education level, language, or other factors. This result should be interpreted in the context of your full clinical picture.`
			});
		} else if (score >= 18 && score <= 25) {
			report.push({
				title: "MoCA Cognitive Test",
				body: `Your MoCA Score: ${score}\nTest Date: ${formData.cognitionTestDate}\n\nWhat this means:\nYour score suggests mild cognitive impairment — a subtle but meaningful decline in memory or thinking that goes beyond normal aging.\nMany individuals in this range are still independent and functional, especially when supported with structured cognitive, nutritional, and lifestyle strategies.\nThe goal now is to slow progression, stabilize function, and support the areas where you may feel changes day to day.\n\nMoCA Score Interpretation:\nNormal Cognitive performance is 26 and above\nMild cognitive impairment is 18-25, a noticeable decline in memory or thinking skills that is greater than normal aging but not severe enough to significantly affect daily life.\nModerate cognitive impairment is 10-17, when memory and thinking problems go beyond mild forgetfulness and begin to noticeably disrupt daily tasks, requiring extra reminders or occasional help to stay independent.\nSevere cognitive impairment is 0-9, when memory and thinking problems are so pronounced that a person can no longer manage daily life on their own and needs regular, hands-on assistance for basic activities.\n\nNext Steps:\nYour MoCA score is one part of a bigger picture. That’s why we created your Brain Health Blueprint — a personalized wellness plan that addresses the root drivers of cognitive change, including inflammation, blood sugar, stress, nutrition, toxins, and more.\nWhether you're in a preventive, early-intervention, or support phase, your Blueprint can guide small, meaningful actions that support brain function and protect quality of life.\n\nMoCA scores may be influenced by education level, language, or other factors. This result should be interpreted in the context of your full clinical picture.`
			});
		} else if (score >= 10 && score <= 17) {
			report.push({
				title: "MoCA Cognitive Test",
				body: `Your MoCA Score: ${score}\nTest Date: ${formData.cognitionTestDate}\n\nWhat this means:\nYour score suggests moderate cognitive impairment, which typically means that memory, focus, or processing speed may now be interfering with some parts of daily life.\nTasks like managing schedules, finances, or remembering instructions may require more reminders or occasional assistance.\nThis is an important stage to implement structured support — both through your Brain Health Blueprint and, where needed, caregiver involvement.\n\nMoCA Score Interpretation:\nNormal Cognitive performance is 26 and above\nMild cognitive impairment is 18-25, a noticeable decline in memory or thinking skills that is greater than normal aging but not severe enough to significantly affect daily life.\nModerate cognitive impairment is 10-17, when memory and thinking problems go beyond mild forgetfulness and begin to noticeably disrupt daily tasks, requiring extra reminders or occasional help to stay independent.\nSevere cognitive impairment is 0-9, when memory and thinking problems are so pronounced that a person can no longer manage daily life on their own and needs regular, hands-on assistance for basic activities.\n\nNext Steps:\nYour MoCA score is one part of a bigger picture. That’s why we created your Brain Health Blueprint — a personalized wellness plan that addresses the root drivers of cognitive change, including inflammation, blood sugar, stress, nutrition, toxins, and more.\nWhether you're in a preventive, early-intervention, or support phase, your Blueprint can guide small, meaningful actions that support brain function and protect quality of life.\n\nMoCA scores may be influenced by education level, language, or other factors. This result should be interpreted in the context of your full clinical picture.`
			});
		} else if (score <= 9) {
			report.push({
				title: "MoCA Cognitive Test",
				body: `Your MoCA Score: ${score}\nTest Date: ${formData.cognitionTestDate}\n\nWhat this means:\nYour score falls within the range for severe cognitive impairment, where memory, communication, and decision-making are significantly affected.\nIndividuals in this range often require regular help with daily tasks like hygiene, meals, and safety.\nThis level of impairment often signals the need for a comprehensive support plan, including medical, emotional, and caregiver-focused resources.\n\nMoCA Score Interpretation:\nNormal Cognitive performance is 26 and above\nMild cognitive impairment is 18-25, a noticeable decline in memory or thinking skills that is greater than normal aging but not severe enough to significantly affect daily life.\nModerate cognitive impairment is 10-17, when memory and thinking problems go beyond mild forgetfulness and begin to noticeably disrupt daily tasks, requiring extra reminders or occasional help to stay independent.\nSevere cognitive impairment is 0-9, when memory and thinking problems are so pronounced that a person can no longer manage daily life on their own and needs regular, hands-on assistance for basic activities.\n\nNext Steps:\nYour MoCA score is one part of a bigger picture. That’s why we created your Brain Health Blueprint — a personalized wellness plan that addresses the root drivers of cognitive change, including inflammation, blood sugar, stress, nutrition, toxins, and more.\nWhether you're in a preventive, early-intervention, or support phase, your Blueprint can guide small, meaningful actions that support brain function and protect quality of life.\n\nMoCA scores may be influenced by education level, language, or other factors. This result should be interpreted in the context of your full clinical picture.`
			});
		}
	} else if (formData.cognitionTestType === 'MMSE' && !isNaN(score)) {
		if (score >= 21 && score <= 26) {
			report.push({
				title: "MMSE Cognitive Test",
				body: `Your MMSE Score: ${score}\nTest Date: ${formData.cognitionTestDate}\n\nMMSE Score Interpretation:\nMild dementia: 21–26\nAn early stage of memory and thinking problems that begin to interfere with daily life, but still allow a person to function mostly independently.\nModerate dementia: 10–20\nWhen memory loss and confusion significantly affect daily functioning — making tasks like managing finances, cooking, or recent recall difficult without assistance.\nSevere dementia: <10\nLoss of clear communication, ability to recognize loved ones, or manage self-care; typically requires full-time support.\n\nWhat this means:\nYour score falls in the range consistent with mild dementia, a stage where memory or thinking changes may be noticeable and begin to affect daily life.\nMany individuals at this stage are still able to live independently but may benefit from added support and proactive brain health strategies.\n\nNext Steps:\nRegardless of score, your MMSE is one part of a larger picture. That’s why we created your Brain Health Blueprint — a personalized, lab-based wellness roadmap built to support your memory, mood, and daily function at every stage.\nUse your Blueprint to begin targeted, science-informed changes that can support cognitive resilience — starting now.\n\nThis scale is used as a general guide and does not replace clinical evaluation. MMSE scores may be influenced by age, education, or testing conditions.`
			});
		} else if (score >= 10 && score <= 20) {
			report.push({
				title: "MMSE Cognitive Test",
				body: `Your MMSE Score: ${score}\nTest Date: ${formData.cognitionTestDate}\n\nMMSE Score Interpretation:\nMild dementia: 21–26\nAn early stage of memory and thinking problems that begin to interfere with daily life, but still allow a person to function mostly independently.\nModerate dementia: 10–20\nWhen memory loss and confusion significantly affect daily functioning — making tasks like managing finances, cooking, or recent recall difficult without assistance.\nSevere dementia: <10\nLoss of clear communication, ability to recognize loved ones, or manage self-care; typically requires full-time support.\n\nWhat this means:\nYour score suggests moderate dementia, a stage where memory loss, confusion, or difficulty with daily tasks becomes more pronounced.\nYou may need help managing things like appointments, medications, or everyday routines — and now is an ideal time to implement structured support.\n\nNext Steps:\nRegardless of score, your MMSE is one part of a larger picture. That’s why we created your Brain Health Blueprint — a personalized, lab-based wellness roadmap built to support your memory, mood, and daily function at every stage.\nUse your Blueprint to begin targeted, science-informed changes that can support cognitive resilience — starting now.\n\nThis scale is used as a general guide and does not replace clinical evaluation. MMSE scores may be influenced by age, education, or testing conditions.`
			});
		} else if (score < 10) {
			report.push({
				title: "MMSE Cognitive Test",
				body: `Your MMSE Score: ${score}\nTest Date: ${formData.cognitionTestDate}\n\nMMSE Score Interpretation:\nMild dementia: 21–26\nAn early stage of memory and thinking problems that begin to interfere with daily life, but still allow a person to function mostly independently.\nModerate dementia: 10–20\nWhen memory loss and confusion significantly affect daily functioning — making tasks like managing finances, cooking, or recent recall difficult without assistance.\nSevere dementia: <10\nLoss of clear communication, ability to recognize loved ones, or manage self-care; typically requires full-time support.\n\nWhat this means:\nYour score falls within the range for severe dementia, where a person may experience significant difficulty with communication, recognition, and self-care.\nThis often signals the need for full-time support, and your care plan should prioritize safety, comfort, and caregiver resources.\n\nNext Steps:\nRegardless of score, your MMSE is one part of a larger picture. That’s why we created your Brain Health Blueprint — a personalized, lab-based wellness roadmap built to support your memory, mood, and daily function at every stage.\nUse your Blueprint to begin targeted, science-informed changes that can support cognitive resilience — starting now.\n\nThis scale is used as a general guide and does not replace clinical evaluation. MMSE scores may be influenced by age, education, or testing conditions.`
			});
		}
	}

	// Past tests
	if (formData.cognitionPastType === 'MoCA' && !isNaN(pastScore)) {
		if (pastScore >= 26) {
			report.push({
				title: "MoCA Cognitive Test",
				body: `Your MoCA Score: ${pastScore}\nTest Date: ${formData.cognitionPastDate}\n\nWhat this means:\nYour score is within the normal range for cognitive function.\nWhile this is a positive result, it's important to remember that brain health can change over time.\nYour Brain Health Blueprint offers proactive strategies to help preserve memory, protect mental clarity, and address hidden risk factors before symptoms ever begin.\n\nMoCA Score Interpretation:\nNormal Cognitive performance is 26 and above\nMild cognitive impairment is 18-25, a noticeable decline in memory or thinking skills that is greater than normal aging but not severe enough to significantly affect daily life.\nModerate cognitive impairment is 10-17, when memory and thinking problems go beyond mild forgetfulness and begin to noticeably disrupt daily tasks, requiring extra reminders or occasional help to stay independent.\nSevere cognitive impairment is 0-9, when memory and thinking problems are so pronounced that a person can no longer manage daily life on their own and needs regular, hands-on assistance for basic activities.\n\nNext Steps:\nYour MoCA score is one part of a bigger picture. That’s why we created your Brain Health Blueprint — a personalized wellness plan that addresses the root drivers of cognitive change, including inflammation, blood sugar, stress, nutrition, toxins, and more.\nWhether you're in a preventive, early-intervention, or support phase, your Blueprint can guide small, meaningful actions that support brain function and protect quality of life.\n\nMoCA scores may be influenced by education level, language, or other factors. This result should be interpreted in the context of your full clinical picture.`
			});
		} else if (pastScore >= 18 && pastScore <= 25) {
			report.push({
				title: "MoCA Cognitive Test",
				body: `Your MoCA Score: ${pastScore}\nTest Date: ${formData.cognitionPastDate}\n\nWhat this means:\nYour score suggests mild cognitive impairment — a subtle but meaningful decline in memory or thinking that goes beyond normal aging.\nMany individuals in this range are still independent and functional, especially when supported with structured cognitive, nutritional, and lifestyle strategies.\nThe goal now is to slow progression, stabilize function, and support the areas where you may feel changes day to day.\n\nMoCA Score Interpretation:\nNormal Cognitive performance is 26 and above\nMild cognitive impairment is 18-25, a noticeable decline in memory or thinking skills that is greater than normal aging but not severe enough to significantly affect daily life.\nModerate cognitive impairment is 10-17, when memory and thinking problems go beyond mild forgetfulness and begin to noticeably disrupt daily tasks, requiring extra reminders or occasional help to stay independent.\nSevere cognitive impairment is 0-9, when memory and thinking problems are so pronounced that a person can no longer manage daily life on their own and needs regular, hands-on assistance for basic activities.\n\nNext Steps:\nYour MoCA score is one part of a bigger picture. That’s why we created your Brain Health Blueprint — a personalized wellness plan that addresses the root drivers of cognitive change, including inflammation, blood sugar, stress, nutrition, toxins, and more.\nWhether you're in a preventive, early-intervention, or support phase, your Blueprint can guide small, meaningful actions that support brain function and protect quality of life.\n\nMoCA scores may be influenced by education level, language, or other factors. This result should be interpreted in the context of your full clinical picture.`
			});
		} else if (pastScore >= 10 && pastScore <= 17) {
			report.push({
				title: "MoCA Cognitive Test",
				body: `Your MoCA Score: ${pastScore}\nTest Date: ${formData.cognitionPastDate}\n\nWhat this means:\nYour score suggests moderate cognitive impairment, which typically means that memory, focus, or processing speed may now be interfering with some parts of daily life.\nTasks like managing schedules, finances, or remembering instructions may require more reminders or occasional assistance.\nThis is an important stage to implement structured support — both through your Brain Health Blueprint and, where needed, caregiver involvement.\n\nMoCA Score Interpretation:\nNormal Cognitive performance is 26 and above\nMild cognitive impairment is 18-25, a noticeable decline in memory or thinking skills that is greater than normal aging but not severe enough to significantly affect daily life.\nModerate cognitive impairment is 10-17, when memory and thinking problems go beyond mild forgetfulness and begin to noticeably disrupt daily tasks, requiring extra reminders or occasional help to stay independent.\nSevere cognitive impairment is 0-9, when memory and thinking problems are so pronounced that a person can no longer manage daily life on their own and needs regular, hands-on assistance for basic activities.\n\nNext Steps:\nYour MoCA score is one part of a bigger picture. That’s why we created your Brain Health Blueprint — a personalized wellness plan that addresses the root drivers of cognitive change, including inflammation, blood sugar, stress, nutrition, toxins, and more.\nWhether you're in a preventive, early-intervention, or support phase, your Blueprint can guide small, meaningful actions that support brain function and protect quality of life.\n\nMoCA scores may be influenced by education level, language, or other factors. This result should be interpreted in the context of your full clinical picture.`
			});
		} else if (pastScore <= 9) {
			report.push({
				title: "MoCA Cognitive Test",
				body: `Your MoCA Score: ${pastScore}\nTest Date: ${formData.cognitionPastDate}\n\nWhat this means:\nYour score falls within the range for severe cognitive impairment, where memory, communication, and decision-making are significantly affected.\nIndividuals in this range often require regular help with daily tasks like hygiene, meals, and safety.\nThis level of impairment often signals the need for a comprehensive support plan, including medical, emotional, and caregiver-focused resources.\n\nMoCA Score Interpretation:\nNormal Cognitive performance is 26 and above\nMild cognitive impairment is 18-25, a noticeable decline in memory or thinking skills that is greater than normal aging but not severe enough to significantly affect daily life.\nModerate cognitive impairment is 10-17, when memory and thinking problems go beyond mild forgetfulness and begin to noticeably disrupt daily tasks, requiring extra reminders or occasional help to stay independent.\nSevere cognitive impairment is 0-9, when memory and thinking problems are so pronounced that a person can no longer manage daily life on their own and needs regular, hands-on assistance for basic activities.\n\nNext Steps:\nYour MoCA score is one part of a bigger picture. That’s why we created your Brain Health Blueprint — a personalized wellness plan that addresses the root drivers of cognitive change, including inflammation, blood sugar, stress, nutrition, toxins, and more.\nWhether you're in a preventive, early-intervention, or support phase, your Blueprint can guide small, meaningful actions that support brain function and protect quality of life.\n\nMoCA scores may be influenced by education level, language, or other factors. This result should be interpreted in the context of your full clinical picture.`
			});
		}
	} else if (formData.cognitionPastType === 'MMSE' && !isNaN(pastScore)) {
		if (pastScore >= 21 && pastScore <= 26) {
			report.push({
				title: "MMSE Cognitive Test",
				body: `Your MMSE Score: ${pastScore}\nTest Date: ${formData.cognitionPastDate}\n\nMMSE Score Interpretation:\nMild dementia: 21–26\nAn early stage of memory and thinking problems that begin to interfere with daily life, but still allow a person to function mostly independently.\nModerate dementia: 10–20\nWhen memory loss and confusion significantly affect daily functioning — making tasks like managing finances, cooking, or recent recall difficult without assistance.\nSevere dementia: <10\nLoss of clear communication, ability to recognize loved ones, or manage self-care; typically requires full-time support.\n\nWhat this means:\nYour score falls in the range consistent with mild dementia, a stage where memory or thinking changes may be noticeable and begin to affect daily life.\nMany individuals at this stage are still able to live independently but may benefit from added support and proactive brain health strategies.\n\nNext Steps:\nRegardless of score, your MMSE is one part of a larger picture. That’s why we created your Brain Health Blueprint — a personalized, lab-based wellness roadmap built to support your memory, mood, and daily function at every stage.\nUse your Blueprint to begin targeted, science-informed changes that can support cognitive resilience — starting now.\n\nThis scale is used as a general guide and does not replace clinical evaluation. MMSE scores may be influenced by age, education, or testing conditions.`
			});
		} else if (pastScore >= 10 && pastScore <= 20) {
			report.push({
				title: "MMSE Cognitive Test",
				body: `Your MMSE Score: ${pastScore}\nTest Date: ${formData.cognitionPastDate}\n\nMMSE Score Interpretation:\nMild dementia: 21–26\nAn early stage of memory and thinking problems that begin to interfere with daily life, but still allow a person to function mostly independently.\nModerate dementia: 10–20\nWhen memory loss and confusion significantly affect daily functioning — making tasks like managing finances, cooking, or recent recall difficult without assistance.\nSevere dementia: <10\nLoss of clear communication, ability to recognize loved ones, or manage self-care; typically requires full-time support.\n\nWhat this means:\nYour score suggests moderate dementia, a stage where memory loss, confusion, or difficulty with daily tasks becomes more pronounced.\nYou may need help managing things like appointments, medications, or everyday routines — and now is an ideal time to implement structured support.\n\nNext Steps:\nRegardless of score, your MMSE is one part of a larger picture. That’s why we created your Brain Health Blueprint — a personalized, lab-based wellness roadmap built to support your memory, mood, and daily function at every stage.\nUse your Blueprint to begin targeted, science-informed changes that can support cognitive resilience — starting now.\n\nThis scale is used as a general guide and does not replace clinical evaluation. MMSE scores may be influenced by age, education, or testing conditions.`
			});
		} else if (pastScore < 10) {
			report.push({
				title: "MMSE Cognitive Test",
				body: `Your MMSE Score: ${pastScore}\nTest Date: ${formData.cognitionPastDate}\n\nMMSE Score Interpretation:\nMild dementia: 21–26\nAn early stage of memory and thinking problems that begin to interfere with daily life, but still allow a person to function mostly independently.\nModerate dementia: 10–20\nWhen memory loss and confusion significantly affect daily functioning — making tasks like managing finances, cooking, or recent recall difficult without assistance.\nSevere dementia: <10\nLoss of clear communication, ability to recognize loved ones, or manage self-care; typically requires full-time support.\n\nWhat this means:\nYour score falls within the range for severe dementia, where a person may experience significant difficulty with communication, recognition, and self-care.\nThis often signals the need for full-time support, and your care plan should prioritize safety, comfort, and caregiver resources.\n\nNext Steps:\nRegardless of score, your MMSE is one part of a larger picture. That’s why we created your Brain Health Blueprint — a personalized, lab-based wellness roadmap built to support your memory, mood, and daily function at every stage.\nUse your Blueprint to begin targeted, science-informed changes that can support cognitive resilience — starting now.\n\nThis scale is used as a general guide and does not replace clinical evaluation. MMSE scores may be influenced by age, education, or testing conditions.`
			});
		}
	}

	// Fallback if willing but no specific trigger
	if (formData.cognitionWilling === 'Yes' && !formData.cognitionTestType) {
		report.push({
			title: "Cognition Test",
			body: "Consider completing the 10-minute cognition test to benchmark your brain function."
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