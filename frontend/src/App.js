/** @format */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Shared Layout Components
import Navbar from './components/nav/Navbar';
import Footer from './components/Footer/Footer';

// Pages
import Home from './pages/homepg/home';
import About from './pages/aboutpg/about';
import Contact from './pages/contactpg/contact';
import Resources from './pages/myreportspg/resourcepg/resources';
import IntakeForm from './pages/intakepg/intakeForm';
import PatientReport from './pages/reportspg/patientReport';
import Dashboard from './pages/dashpg/dashboard';
import UserDetails from './pages/userdetailspg/UserDetails';
import MyReports from './pages/myreportspg/MyReports';
import EvexiaLabReport from './pages/evexialabreportpg/evexialabreport';
import ScreeningOrder from './pages/screeningorderpg/ScreeningOrder';
import UserList from './pages/userslistpg/UserList';
import AuditLog from '../src/pages/auditpg/AuditLog';
import { AuthProvider } from './auth/AuthContext';
import Login from './pages/loginpg/login';
import SignUp from './pages/signuppg/SignUp';
import ForgotPassword from './pages/forgotpasswordpg/ForgotPassword';
import ResetPassword from './pages/resetpasswordpg/ResetPassword';
import ConfirmEmail from './pages/confirmemailpg/ConfirmEmail';
import GoogleCalendar from './pages/calendarpg/GoogleCalendar';
import SuccessPage from './pages/successpg/Success';
import CancelPage from './pages/cancelpg/Cancel';
import CheckoutPage from './pages/checkoutpg/Checkout';
import ProductsPage from './pages/stripeproductspg/ProductsPage';
import TermsOfService from './pages/tosPg/termsofservice';
import PrivacyPolicy from './pages/privacypolicypg/privacypolicy';
import AutomatedLabResults from './pages/automatedlabresults/AutomatedLabResults';
// New 2-step signup
import EmailStep from './pages/NewCheckoutPages/EmailStep';
import CheckoutStep from './pages/NewCheckoutPages/CheckoutStep';
import SignupProvider from './pages/NewCheckoutPages/SignupContext';
import PatientOrders from './pages/evexiapatientorderspg/EvexiaPatientOrders';
import PatientRequisitionViewer from './pages/patientrequisitionviewerpg/PatientRequisitionViewer';
import StepThreeAccountSetup from './pages/stepthreepg/Step3AccountSetup';
import Account from './pages/accountpg/Account';
import Support from './pages/supportpg/Support';
import Messages from './pages/messagespg/Messages';
import Appointments from './pages/appointmentspg/Appointments';
import Article from './pages/myreportspg/articles/Article';
import NotFound from './pages/notfoundpg/NotFound';

function App() {
  return (
    <div className="AppShell">
      <Navbar />
      <main className="PageBody">
        <SignupProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
             <Route path="/evexia-lab-results" element={<EvexiaLabReport />} />
             <Route path="/google-calendar" element={<GoogleCalendar />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/cancel-order" element={<CancelPage />} />
            <Route path="/order" element={<CheckoutStep />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

             <Route path="/admin/users/:id" element={<UserDetails />} />
             <Route path="/intake-form" element={<IntakeForm />} />
             <Route path="/report" element={<PatientReport />} />
             <Route path="/my-reports" element={<MyReports />} />
             <Route path="/admin/dashboard" element={<Dashboard />} />
             <Route path="/admin/users" element={<UserList />} />
             <Route path="/admin/logs" element={<AuditLog />} />

             <Route path="/screening-order" element={<ScreeningOrder />} />

             <Route path="/patient-orders" element={<PatientOrders />} />

             <Route path="/automated-lab-results" element={<AutomatedLabResults />} />

             <Route path="/patient-req" element={<PatientRequisitionViewer />} />

            <Route path="/confirm-email" element={<ConfirmEmail />} />

             <Route path="/join" element={<EmailStep />} />
            <Route path="/join/checkout" element={<CheckoutStep />} />
             <Route path="/account-info" element={<StepThreeAccountSetup />} />
             <Route path="/sign-up" element={<SignUp />} />
             <Route path="/account" element={<Account />} />
             <Route path="/support" element={<Support />} />
             <Route path="/messages" element={<Messages />} />
             <Route path="/appointments" element={<Appointments />} />
             <Route path="/faq" element={<Resources />} />
             <Route path="/resources/articles/:slug" element={<Article />} />
             <Route path="*" element={<NotFound />} />
          </Routes>
        </SignupProvider>
      </main>
      <Footer />
    </div>
  );
}

/* AppWrapper places AuthProvider above App so useAuth works inside App */
export default function AppWrapper() {
  return (
    <AuthProvider>
      <Router>
        <App />
      </Router>
    </AuthProvider>
  );
}