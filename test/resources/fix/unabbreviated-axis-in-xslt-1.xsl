<?xml version="1.0" encoding="UTF-8"?>
<!--
* SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
* SPDX-License-Identifier: MIT
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  <xsl:template match="R">
    <xsl:copy-of select="self::node()[1]"/>
    <xsl:copy-of select="parent::node()[1]"/>
  </xsl:template>
</xsl:stylesheet>
