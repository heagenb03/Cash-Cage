#pragma once

#include <vector>
#include <optional>
#include "../models/types.hpp"

namespace dealr {

std::vector<Settlement> solveMILP(
    const std::vector<PlayerBalance>& balances,
    std::optional<int> maxTransfersPerPlayer = std::nullopt,
    std::optional<double> minTransferAmount = std::nullopt
);

}
