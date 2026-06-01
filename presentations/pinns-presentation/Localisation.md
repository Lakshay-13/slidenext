# Localized Physics-Informed Neural Networks (PINNs)

Traditional Physics-Informed Neural Networks (PINNs) often struggle to generalize when applied to large spatial or temporal domains. As the domain size increases, the optimization landscape becomes increasingly complex, leading to issues like spectral bias (favoring low-frequency solutions) and difficulty in capturing high-frequency oscillations or localized sharp transitions.

This project introduces **Localized PINNs**, a novel architectural modification that constrains the "receptive field" of individual neurons using localized kernels. This approach effectively decomposes a global PDE problem into local sub-problems that the network can learn more efficiently.

## Core Methodology

The localization is achieved by introducing a "Localization Layer" (typically the first hidden layer). Each neuron $j$ in this layer is assigned a kernel function $\mathcal{K}_j$ that scales its activation based on the distance from a center $\mu_j$.

### The Localized Neuron
The output of a localized neuron $j$ for an input $x$ is:
$$h_j(x) = \text{Activation}\left( \mathbf{W}_j \mathbf{x} + \mathbf{b}_j \right) \cdot \mathcal{K}_j(x; \mu_j, \sigma_j)$$

### Supported Localization Kernels

This project implements several kernel types, each offering different "focus" characteristics:

1.  **Gaussian Kernel:** Provides a smooth, bell-shaped localization.
    $$\mathcal{K}(x) = \exp\left( -\frac{(x - \mu)^2}{2\sigma^2} \right)$$

2.  **Super Gaussian Kernel:** Creates a "flat-top" response with sharp edges, useful for partitioning the domain into nearly disjoint segments.
    $$\mathcal{K}(x) = \exp\left[ -\frac{1}{2} \left( \frac{x - \mu}{\sigma} \right)^P \right]$$
    *Note: $P$ is a large even integer (e.g., $P=20$) to ensure sharp decay.*

3.  **Ricker Wavelet (Mexican Hat):** Captures multi-scale features and local oscillations better than monotonic kernels.
    $$\mathcal{K}(x) = \left( 1 - \frac{(x - \mu)^2}{\sigma^2} \right) \exp\left( -\frac{(x - \mu)^2}{2\sigma^2} \right)$$

4.  **Boxcar Kernel:** A hard-step localization that strictly limits a neuron's influence to a specific interval $[\mu - \sigma/2, \mu + \sigma/2]$.

## Key Innovations

*   **Learnable Locality:** Unlike domain decomposition methods that use fixed sub-domains, our $\mu_j$ (centers) and $\sigma_j$ (widths) can be optimized via backpropagation. This allows the network to autonomously "zoom in" on regions with high gradients or complex physics.
*   **Gradient Sensitivity Analysis:** We use specialized "Gradient Heatmaps" to visualize how the network's internal sensitivity aligns with the PDE's physical domain. This provides empirical evidence that localized neurons actually specialize in their assigned regions.
*   **Domain Scaling:** Automatic normalization and scaling of large domains into a range where localization kernels are most effective.

## Results & Performance

Experiments on the **Nonlinear Harmonic Oscillator** (over a $4\pi$ period) demonstrate the following improvements over standard Fully Connected Neural Networks (FCNNs):

| Metric | Standard FCNN | Localized PINN |
| :--- | :--- | :--- |
| **Residual Convergence** | $10^{-2} \sim 10^{-3}$ | $10^{-5} \sim 10^{-7}$ |
| **Phase Accuracy** | Often drifts at $T > 2\pi$ | Maintains phase throughout $4\pi$ |
| **Stability** | Sensitive to initialization | Highly robust across different seeds |

### Visualization of Specialization
By tracking $\mu$ and $\sigma$ during training, we observe that neurons naturally distribute themselves across the temporal domain. In the "Single Layer" experiments, the Gaussian centers $\mu$ tend to form a uniform grid, effectively acting as a learnable basis for the solution space.

## Technical Implementation

The project is built on **PyTorch** and extends the **Neurodiffeq** library. Key modules include:

*   `CustomNN`: A flexible architecture where localization can be applied to any layer.
*   `render()`: An advanced diagnostic suite for plotting residuals, gradient heatmaps, and parameter evolution.
*   `HO/`: Comprehensive solvers for the Harmonic Oscillator with various kernels.
*   `Heat Equation/`: Extension to 1D spatial-temporal problems.
*   `4D/`: Experimental support for high-dimensional PDE systems.

## Installation & Setup

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
pip install torch numpy matplotlib seaborn neurodiffeq scipy
```

To run a simulation, execute any of the "final run" notebooks in the `HO/` or `Heat Equation/` directories. Each notebook is paired with a corresponding `.py` script containing the localized model definitions.
