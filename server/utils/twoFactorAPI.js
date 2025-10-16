// utils/twoFactorAPI.js
import axios from "axios";

/**
 * Utility to handle 2Factor API integration for OTP
 */
class TwoFactorAPI {
    constructor() {
        this.apiKey = "613e3a34-8571-11f0-a562-0200cd936042";
        this.baseURL = "https://2factor.in/API/V1";
    }

    /**
     * Send OTP via 2Factor API
     * @param {string} phoneNumber - Phone number with country code
     * @returns {Promise<{sessionId: string, status: string}>} - Response with session ID
     */
    async sendOTP(phoneNumber) {
        try {
            // Remove any spaces or special characters
            const cleanedNumber = phoneNumber.replace(/[^0-9+]/g, "");

            const response = await axios.get(
                `${this.baseURL}/${this.apiKey}/SMS/${cleanedNumber}/AUTOGEN/GIGGLES`,
            );

            if (response.data.Status === "Success") {
                return {
                    sessionId: response.data.Details,
                    status: "success",
                };
            } else {
                throw new Error(response.data.Details || "Failed to send OTP");
            }
        } catch (error) {
            console.error(
                "2Factor API Error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to send OTP. Please try again later.");
        }
    }

    /**
     * Verify OTP via 2Factor API
     * @param {string} sessionId - Session ID received from sendOTP
     * @param {string} otp - OTP entered by user
     * @returns {Promise<{status: string}>} - Verification status
     */
    async verifyOTP(sessionId, otp) {
        try {
            const response = await axios.get(
                `${this.baseURL}/${this.apiKey}/SMS/VERIFY/${sessionId}/${otp}`,
            );

            if (response.data.Status === "Success") {
                return {
                    status: "success",
                };
            } else {
                throw new Error(response.data.Details || "Invalid OTP");
            }
        } catch (error) {
            console.error(
                "2Factor API Error:",
                error.response?.data || error.message,
            );
            throw new Error(
                "Failed to verify OTP. Please try again with correct OTP.",
            );
        }
    }
}

export default new TwoFactorAPI();
