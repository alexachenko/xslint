<?xml version="1.0" encoding="UTF-8"?>
<!--
* SPDX-FileCopyrightText: Copyright (c) 2025-2026 Max Trunnikov
* SPDX-License-Identifier: MIT
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" expand-text="yes">
  <xsl:template match="section">
    <p>{count(item) = 0}</p>
    <xsl:value-of _select="name(.)"/>
    <xsl:value-of select="@x"/>
    <q xsl:expand-text="no">{count(item)}</q>
    <r>{{literal}}</r>
  </xsl:template>
</xsl:stylesheet>
