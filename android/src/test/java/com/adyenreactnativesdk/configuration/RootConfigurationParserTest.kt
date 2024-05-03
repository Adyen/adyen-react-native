package com.adyenreactnativesdk.configuration

import com.adyen.checkout.core.Environment
import org.junit.Assert
import org.junit.Test

class RootConfigurationParserTest {

    @Test
    fun getClientKeyParameters() {
        // GIVEN
        val map = WritableMapMock()
        map.putString(RootConfigurationParser.CLIENT_KEY_KEY, "test_SOMEVALUE")

        // WHEN
        val rootParser = RootConfigurationParser(map)

        // THEN
        Assert.assertNotNull(rootParser.clientKey)
    }

    @Test
    fun getAmountParameters() {
        // GIVEN
        val map = WritableMapMock()
        val amountmap = WritableMapMock()
        amountmap.putInt("value", 123456)
        amountmap.putString("currency", "USD")
        map.putMap(RootConfigurationParser.AMOUNT_KEY, amountmap)

        // WHEN
        val rootParser = RootConfigurationParser(map)

        // THEN
        Assert.assertNotNull(rootParser.amount)
        Assert.assertEquals(rootParser.amount?.value, 123456.toLong())
        Assert.assertEquals(rootParser.amount?.currency, "USD")
    }

    @Test
    fun getLiveEnvironment() {
        // GIVEN
        val map = WritableMapMock()
        map.putString(RootConfigurationParser.ENVIRONMENT_KEY, "live")

        // WHEN
        val rootParser = RootConfigurationParser(map)
        val environment = rootParser.environment

        // THEN
        Assert.assertEquals(Environment.EUROPE, environment)
    }

    @Test
    fun getInvalidEnvironment() {
        // GIVEN
        val map = WritableMapMock()
        map.putString(RootConfigurationParser.ENVIRONMENT_KEY, "beta")

        // WHEN
        val rootParser = RootConfigurationParser(map)
        val environment = rootParser.environment

        // THEN
        Assert.assertEquals(Environment.TEST, environment)
    }
}