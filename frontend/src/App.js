/** @format */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './pages/loginpg/login';
import SignUp from './pages/signuppg/SignUp';
import ForgotPassword from './pages/forgotpasswordpg/ForgotPassword';
import ResetPassword from './pages/resetpasswordpg/ResetPassword';
import ConfirmEmail from './pages/confirmemailpg/ConfirmEmail';
import GoogleCalendar from './pages/calendarpg/GoogleCalendar';
import PatientBooking from './pages/calendarpg/PatientBooking';
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
import Article from './pages/myreportspg/articles/Article';
import JoinCheckoutWrapper from './pages/NewCheckoutPages/JoinCheckoutWrapper';


function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="AppShell">
          <a href="#main-content" className="skip-link sr-only">Skip to main content</a>
          <Navbar />
          <main id="main-content" className="PageBody">
            {/* ✅ Provider goes OUTSIDE <Routes>, not inside */}
            <SignupProvider>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/evexia-lab-results"
                  element={<EvexiaLabReport />}
                />
                 <Route path="/google-calendar" element={<GoogleCalendar />} />
                 <Route
                   path="/patient-booking"
                   element={
                     <ProtectedRoute>
                       <PatientBooking />
                     </ProtectedRoute>
                   }
                 />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/success" element={<SuccessPage />} />
                <Route path="/cancel-order" element={<CancelPage />} />
                <Route path="/order" element={<ProductsPage />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />

                <Route
                  path="/admin/users/:id"
                  element={
                    <ProtectedRoute>
                      <UserDetails />
                    </ProtectedRoute>
                  }
                />
                 <Route
                   path="/intake-form"
                   element={
                     <ProtectedRoute>
                       <IntakeForm />
                     </ProtectedRoute>
                   }
                 />
                   <Route
                     path="/report"
                     element={
                       <ProtectedRoute>
                         <PatientReport />
                       </ProtectedRoute>
                     }
                   />
                   <Route
                     path="/reports/:reportId"
                     element={
                       <ProtectedRoute>
                         <PatientReport />
                       </ProtectedRoute>
                     }
                   />
                 <Route
                   path="/my-reports"
                   element={
                     <ProtectedRoute>
                       <MyReports />
                     </ProtectedRoute>
                   }
                 />
                  <Route
                    path="/faq"
                    element={
                      <ProtectedRoute>
                        <Resources />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/resources/articles/:slug"
                    element={<Article />}
                  />

                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute>
                      <UserList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/logs"
                  element={
                    <ProtectedRoute>
                      <AuditLog />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/screening-order"
                  element={
                    <ProtectedRoute>
                      <ScreeningOrder />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/patient-orders"
                  element={
                    <ProtectedRoute>
                      <PatientOrders />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/automated-lab-results"
                  element={<AutomatedLabResults />}
                />

                <Route
                  path="/patient-req"
                  element={<PatientRequisitionViewer />}
                />

                <Route path="/sign-up" element={<SignUp />} />
                <Route path="/confirm-email" element={<ConfirmEmail />} />

                {/* ✅ Your 2-step flow */}
                <Route path="/join" element={<EmailStep />} />
                <Route
                  path="/join/checkout"
                  element={<JoinCheckoutWrapper />}
                />
                <Route path="/account-info" element={<StepThreeAccountSetup />} />
                 <Route
                   path="/account"
                   element={
                     <ProtectedRoute>
                       <Account />
                     </ProtectedRoute>
                   }
                 />
                 <Route path="/support" element={<Support />} />
                 <Route
                   path="/messages"
                   element={
                     <ProtectedRoute>
                       <Messages />
                     </ProtectedRoute>
                   }
                 />
                {/* optional 404 */}
                {/* <Route path="*" element={<NotFound />} /> */}
              </Routes>
            </SignupProvider>
          </main>
          <Footer />
        </div>
    </Router>
  </AuthProvider>
  );
}

export default App;
