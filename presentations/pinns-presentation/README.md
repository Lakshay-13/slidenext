# 🚀 RL-PINN: Reinforcement Learning for Physics-Informed Neural Networks

<p align="center">
  <img src="rlpinns.png" alt="RL-PINN Architecture Poster" width="1000">
</p>

[![Research](https://img.shields.io/badge/Research-PINNs-blue)](https://github.com/lakshaychawla/rl-pinn)
[![Engine](https://img.shields.io/badge/Engine-PyTorch-EE4C2C)](https://pytorch.org/)
[![Status](https://img.shields.io/badge/Status-Active%20Research-green)](#)

A high-performance, GPU-accelerated framework for **RL-driven Hyperparameter Tuning** in Physics-Informed Neural Networks (PINNs). This project leverages Deep Reinforcement Learning to dynamically optimize the training trajectory of PINNs, ensuring faster convergence and higher accuracy in solving complex partial differential equations (PDEs).

---

## 🔬 Project Overview

Traditional PINNs often suffer from delicate hyperparameter sensitivities and slow convergence. **RL-PINN** treats the training process as a Markov Decision Process (MDP), where an RL agent (DQN/MP-DQN) acts as the "controller," adjusting learning rates, loss weights, and architectural parameters in real-time.

### Key Research Objectives
- **Dynamic Optimization:** Replace static schedules with adaptive RL-driven policies.
- **Hardware Efficiency:** Maximum utilization of multi-GPU environments through smart load balancing.
- **Robustness:** Resilient training loops with automatic OOM handling and early stopping.

---

## 🏗️ Architecture & Core Logic

The system operates in a **Cycle-based Loop**:
1.  **Collection Phase:** Parallel workers run PINN training instances on diverse GPUs.
2.  **Memory Generation:** State-action-reward transitions are stored in a unified replay buffer.
3.  **Policy Update:** The RL agent trains on collected memories to refine its tuning strategy.
4.  **Deployment:** The improved policy is used in the next cycle to guide new PINN instances.

### Multi-GPU Worker Matrix
The framework features a sophisticated **Load Balancer** that:
- Proportionalizes workers based on available VRAM.
- Uses `multiprocessing` (spawn method) for safe CUDA context sharing.
- Automatically rotates devices upon OOM failure.

---

## ⚙️ Training Configuration

### Memory & Buffer Management
*   **Capacity:** Unlimited (system-swap backed).
*   **Warm-up:** First cycle collects **100,000** memories with $\epsilon=0.99$ (aggressive exploration).
*   **Growth:** Memory collection target increases by **25,000** per cycle (e.g., Cycle 2 = 125k, Cycle 3 = 150k) to provide a richer dataset for the evolving policy.

### Epsilon ($\epsilon$) Decay Schedule
*   **Initial:** 0.99.
*   **Decay:** 0.80 per cycle.
*   **Floor:** 0.50 (Ensures persistent exploration for non-stationary optimization landscapes).

### Reward Function
The agent is incentivized by the rate of change in the residual loss:
$$ \mathcal{R} = 50 \times (\log_{10}(\mathcal{L}_{old}) - \log_{10}(\mathcal{L}_{new})) $$
*   **Penalty:** Continuous penalty applied for incomplete $s_v$ vector usage: $2.0 \times \sum(1.0 - s_v)$.
*   **Discount ($\gamma$):** 0.99 (Prioritizes long-term training stability).

---

## 🛠️ Interactive Launcher & CLI

The `project.py` front-end provides a terminal-based interface for strategy benchmarking.

### Strategy Support
- `default`: Baseline PINN controller.
- `mpdqn`: Multi-Pass Deep Q-Network.
- `seq-madac`: Sequential Multi-Agent Deep Action-conditioned tuning.
- `flexplore`: Flexible Exploration strategy.

### Usage Examples
```bash
# Auto-benchmark hardware and run a specific strategy
python3 project.py --auto --strategy mpdqn

# Force local machine optimized profile
python3 project.py --lmac --strategy default
```

---

## 🚀 Key Features
- **Pure PyTorch:** No legacy dependencies.
- **Smart Hardware Scan:** Built-in benchmarking to find the optimal worker count.
- **Early Stopping:** Prevent target network overfitting via patience-based triggers.
- **Automatic Visualization:** Generates loss curves, residual heatmaps, and comparison plots.
- **Dynamic Resumption:** Seamlessly continue training from any cycle checkpoint.

---

## 📅 Future Research Directions (TODO)

### 1. Curriculum Learning 🎓
Implementing a phased curriculum to adjust computational intensity as the policy stabilizes.

| Phase | Cycles | Epochs/step | Steps/episode | Purpose |
|-------|--------|-------------|---------------|---------|
| Discovery | 1-3 | 20 | 1000 | Fast hyperparameter exploration |
| Refinement | 4-7 | 50 | 500 | Standard training |
| Fine-tuning | 8-10 | 100 | 200 | Deep convergence |

### 2. Localization in PINNs 📍
Introducing architectural constraints to handle large-scale domains and spectral bias.
- **Localized Kernels:** Replace global neurons with localized "receptive fields" using Gaussian, Super Gaussian, or Ricker Wavelet kernels.
- **Learnable Locality:** Optimize kernel centers ($\mu$) and widths ($\sigma$) via backpropagation.
- **Domain Decomposition:** Autonomously partition the PDE domain into sub-problems for efficient learning of high-frequency features.

---

## 📦 Installation

```bash
pip install -r requirements.txt
```

### Docker Support (Linux/Server)
```bash
# Build
docker build -t rl-pinn .

# Run Hardware Scan
docker run --rm rl-pinn scan

# Run Sequential Benchmarks
docker run --rm rl-pinn run auto 1 2 3 4
```

---

## 📝 Citation & References
If you use this framework in your research, please cite the project as:
> *Chawla, L. (2026). RL-PINN: Reinforcement Learning for Physics-Informed Neural Networks. M.Tech Thesis Research.*

