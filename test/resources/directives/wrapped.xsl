<?xml version="1.0" encoding="UTF-8"?>
<!--
* SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
* SPDX-License-Identifier: MIT
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0" id="s">
  <xsl:output method="xml"/>
  <xsl:template match="/">
    <!-- xslint-disable-next-line using-namespace-axis -->
    <xsl:if test="@a
                  and namespace::*">
      <xsl:value-of select="."/>
    </xsl:if>
  </xsl:template>
</xsl:stylesheet>
