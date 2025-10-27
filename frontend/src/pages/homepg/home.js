/** @format */

import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/cards/Card";
import DividerWave from "../../components/bg/DividerWave";
import {
		// PrimaryButton,
		// SecondaryButton,
		// OutlineButton,
    PillOne,
    PillTwo
	} from "../../components/button/Buttons";
import { useAuth } from "../../auth/AuthContext";

import CaregiverIcon from "../../assets/icons/Caregiver.png";
import HeartHandsIcon from "../../assets/icons/HeartHands.png";
import LocationIcon from "../../assets/icons/Location.png";
import './home.css';

function Home() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const handleViewDetails = () => {
		if (user) {
			navigate("/dashboard");
			return;
		}
		navigate("/sign-up");
	};

	return (
    <main className="main-content">
      <section className="hero-section">
        <h1>Supporting Alzheimer's Care & Families</h1>
        <p>
          We're here to guide, support, and empower caregivers and loved ones
          every step of the way.
        </p>

        <div className="button-row">
          <PillOne onClick={() => navigate('/')}> 
            Learn More
          </PillOne>
          {/* was /about */}
          <PillTwo onClick={() => navigate('/')}>
            Resources
          </PillTwo>
          {/* was /resources  */}
          {/* <OutlineButton onClick={() => navigate('/intake-form')}>
            Start Now
          </OutlineButton> */}
        </div>

        {/* <div className="card-wrapper">
          <Card title="Welcome" subtitle="Your intake is scheduled">
            <SecondaryButton onClick={handleViewDetails}>
              View Details
            </SecondaryButton>
          </Card>
        </div> */}

        <section className="card-section">
          <div style={{cursor:'pointer'}} className="card-grid">
            <Card
              title="For Caregivers"
              subtitle="Tips, advice..."
              icon={CaregiverIcon}
            />
            <Card
              title="For Loved Ones"
              subtitle="Engaging activities...stuff this and that and the other"
              icon={HeartHandsIcon}
            />
            <Card
              title="Local Resources"
              subtitle="Find services nearby"
              icon={LocationIcon}
            />
          </div>
          <DividerWave />
        </section>
      </section>
    </main>
  );
}

export default Home;
