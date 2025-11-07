/** @format */

import React, { useState } from 'react';
import TextInput from '../inputs/InputText.js';

function PatientDemographicsForm(props) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    height: '',
    weight: '',
    gender: '',
    ethnicity: [],
    caregiverFirstName: '',
    caregiverLastName: '',
    caregiverPhone: '',
    caregiverEmail: ''
  });

  const handleChange = (e) => {
    const { id, value, checked } = e.target;

    if (id === 'ethnicity') {
      const updated = checked
        ? [...formData.ethnicity, value]
        : formData.ethnicity.filter((item) => item !== value);
      setFormData((prev) => ({ ...prev, ethnicity: updated }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));

      // Notify parent if gender is changed
      if (id === 'gender' && props.setGender) {
        props.setGender(value);
      }
    }
  };

  const isValidAge = (dobStr) => {
    const dob = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 18;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidAge(formData.dob)) {
      alert(
        'You must be 18 years or older to complete this form. If you are under 18, please contact support.'
      );
      return;
    }
  };

  const usStates = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY'
  ];

  const ethnicities = [
    'American Indian or Alaska Native',
    'Asian',
    'Black or African American',
    'Hispanic or Latino',
    'Native Hawaiian or Pacific Islander',
    'White',
    'Other'
  ];

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <TextInput
        id="firstName"
        label="First Name"
        maxLength={30}
        value={formData.firstName}
        onChange={handleChange}
      />
      <TextInput
        id="lastName"
        label="Last Name"
        maxLength={30}
        value={formData.lastName}
        onChange={handleChange}
      />
      <TextInput
        id="email"
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleChange}
      />
      <TextInput
        id="phone"
        label="Phone Number"
        type="tel"
        value={formData.phone}
        onChange={handleChange}
      />
      <TextInput
        id="dob"
        label="Date of Birth"
        type="date"
        value={formData.dob}
        onChange={handleChange}
      />

      <TextInput
        id="street"
        label="Street Address"
        maxLength={50}
        value={formData.street}
        onChange={handleChange}
      />
      <TextInput
        id="city"
        label="City"
        maxLength={50}
        value={formData.city}
        onChange={handleChange}
      />

      <div className="input-group">
        <label htmlFor="state">State</label>
        <select id="state" value={formData.state} onChange={handleChange}>
          <option value="">Select a state</option>
          {usStates.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      <TextInput
        id="zip"
        label="Zip Code"
        type="text"
        maxLength={5}
        value={formData.zip}
        onChange={handleChange}
      />
      <TextInput
        id="height"
        label="Height (example: 5'8')"
        value={formData.height}
        onChange={handleChange}
      />

      <TextInput
        id="weight"
        label="Weight (lbs)"
        type="number"
        value={formData.weight}
        onChange={handleChange}
      />

      <div className="input-group">
        <label htmlFor="gender">Gender at Birth</label>
        <select id="gender" value={formData.gender} onChange={handleChange}>
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      <div className="input-group">
        <label>Ethnicity (select all that apply)</label>
        {ethnicities.map((eth) => (
          <div key={eth}>
            <label>
              <input
                type="checkbox"
                id="ethnicity"
                value={eth}
                checked={formData.ethnicity.includes(eth)}
                onChange={handleChange}
              />
              {eth}
            </label>
          </div>
        ))}
      </div>

      {/* <h3>Caregiver (if not the patient)</h3>
			<TextInput id="caregiverFirstName" label="Caregiver First Name" value={formData.caregiverFirstName} onChange={handleChange} />
			<TextInput id="caregiverLastName" label="Caregiver Last Name" value={formData.caregiverLastName} onChange={handleChange} />
			<TextInput id="caregiverPhone" label="Caregiver Phone Number" type="tel" value={formData.caregiverPhone} onChange={handleChange} />
			<TextInput id="caregiverEmail" label="Caregiver Email" type="email" value={formData.caregiverEmail} onChange={handleChange} />

			<button type="submit" className="btn">Submit</button> */}
    </form>
  );
}

export default PatientDemographicsForm;
