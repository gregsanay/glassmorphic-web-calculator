# Glassmorphic Web Calculator

A design-first exploration into **Glassmorphism** and modern web aesthetics, deployed through the lens of a highly functional, multi-mode calculator. 

While inspired by the layout of the Windows 11 Fluent Calculator, the primary purpose of this project was not to create a verbatim clone, but rather to push the boundaries of native CSS glassmorphism, dynamic blur effects, and responsive state-driven UI without relying on heavy frontend frameworks.

## 🎨 The Design Philosophy (Glassmorphism)

This project heavily utilizes the principles of Glassmorphism to create a premium, "acrylic" feel:
*   **Dynamic Backdrop Filtering:** Utilization of `backdrop-filter: blur()` across layered panels, sidebars, and overlays to create depth.
*   **Translucent Layering:** Carefully calculated `rgba()` background opacities that allow the environment to shine through without compromising text legibility.
*   **Micro-interactions:** Smooth scaling animations on button presses to simulate tactile feedback.
*   **Responsive Fluidity:** Adaptive UI that seamlessly collapses secondary readouts into toggles on smaller screens to prioritize negative space and visual hierarchy.

## ⚙️ Core Features

*   **Standard Mode:** Basic arithmetic operations with an intuitive, clean UI.
*   **Scientific Mode:** Advanced mathematical functions, trigonometry (Degrees/Radians), logarithms, exponents, and constants (π, e).
*   **Programmer Mode:** 64-bit interactive bitboard, base conversions (HEX, DEC, OCT, BIN), bitwise operations (AND, OR, XOR, NOT, Shifts), and word sizes.
*   **Date Calculation:** Calculate the exact difference between two dates, or add/subtract intervals from a specific date.
*   **State Persistence:** Features comprehensive SQLite history tracking, memory functionality, and saves your active calculator mode and theme locally.
*   **Secure Architecture:** Math evaluation is securely handled on the backend using Python's `ast` (Abstract Syntax Tree) module, preventing malicious code injection.

## 🛠️ Tech Stack

*   **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (Vanilla)
*   **Backend:** Python 3, Flask, Flask-CORS
*   **Database:** SQLite3

## 🚀 Installation and Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/glassmorphic-calculator.git
    cd glassmorphic-calculator
    ```

2.  **Create a virtual environment (optional but recommended):**
    ```bash
    python -m venv .venv
    # Windows
    .venv\Scripts\activate
    # macOS/Linux
    source .venv/bin/activate
    ```

3.  **Install the dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the application:**
    ```bash
    python app.py
    ```

5.  **Access the app:** Open your web browser and navigate to `http://127.0.0.1:5000/`

## 📸 Screenshots

*(Add your beautiful screenshots here demonstrating the Glassmorphism effect in both Dark and Light themes!)*

## 📄 License

This project is open-source and available under the MIT License.
