﻿using NBitcoin;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Breeze.TumbleBit.Models
{
    public class TumblerEscrowKeyResponse
    {
        public int KeyIndex { get; set; }

        public PubKey PubKey { get; set; }
    }
}
